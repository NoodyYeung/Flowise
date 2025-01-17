// src/customApiClient/SuenovaApiClient.ts
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import axios, { AxiosInstance, AxiosResponse } from 'axios'

interface SuenovaApiClientOptions {
    basePath: string
    apiKey: string
    timeout?: number
    disableSSL?: boolean
}

interface GenerateTextParams {
    prompt: string
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    bestOf?: number
    // Add other parameters as needed
}

interface SuenovaApiResponse {
    success: boolean
    content: any
}

export class SuenovaApiClient {
    private axiosInstance: AxiosInstance
    private deploymentName: string
    private tools: any[] = []

    constructor(options: SuenovaApiClientOptions, deploymentName: string) {
        const httpsAgent = new (require('https').Agent)({
            // rejectUnauthorized: !options.disableSSL, // Disable SSL verification if specified
            rejectUnauthorized: false // Disable SSL verification if specified
        })

        this.axiosInstance = axios.create({
            baseURL: options.basePath,
            headers: {
                Authorization: `Bearer ${options.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: options.timeout || 180000, // Default to 180 seconds
            // httpsAgent: options.disableSSL ? httpsAgent : undefined,
            httpsAgent: httpsAgent
        })

        this.deploymentName = deploymentName
    }

    /**
     * List available models from the Suenova API.
     * Adjust the endpoint if necessary.
     *
     *
     */
    async listModels(): Promise<string[]> {
        try {
            const response: AxiosResponse<any> = await this.axiosInstance.get('/models')
            const models = response.data.data.map((model: any) => model.id)

            return models || ['Qwen2.5-32B-Instruct']
        } catch (error: any) {
            console.error('Error fetching models:', error.message)
            return []
        }
    }

    getRoleFromMessage(message: BaseMessage): string {
        if (message instanceof HumanMessage || message instanceof SystemMessage) {
            return 'user'
        }

        //AIMessage, ToolMessage, FunctionMessage
        return 'assistant'
    }

    getContentFromMessage(message: BaseMessage): string {
        return message.content.toString()
    }

    buildBody(messages: BaseMessage[]): any {
        const bodyMessages = messages.map((message) => {
            return {
                role: this.getRoleFromMessage(message),
                content: this.getContentFromMessage(message)
            }
        })

        return bodyMessages
    }

    setTools(tools: any[]) {
        this.tools = tools
    }

    async chat(messages: BaseMessage[]): Promise<AIMessage[]> {
        const headers = new Headers()
        headers.append('Content-Type', 'application/json')

        const body = this.buildBody(messages)

        const payload = {
            model: this.deploymentName,
            messages: body,
            functions: [],
            temperature: 0.7
            // Include other parameters as needed
        }
        var inTools = []
        for (var i = 0; i < this.tools.length; i++) {
            if (this.tools[i]) inTools.push(this.tools[i])
        }
        const sanitizedPayload = {
            model: payload.model,
            messages: payload.messages,
            temperature: payload.temperature || 0.7,
            tools: inTools
        }

        console.log('SuenovaApiClient.ts: 105', body)
        console.log('SuenovaApiClient.ts: 106', sanitizedPayload)

        // return await fetch(`${this.config.baseUrl}/v1/chat/completions`, requestOptions)
        //     .then((response) => response.json())
        //     .then((body) => body.messages.map((message: any) => new AIMessage(message.content)))

        return this.axiosInstance.post(`/engines/${payload.model}/chat/completions`, sanitizedPayload).then((response) => {
            console.log('SuenovaApiClient.ts: 123', response)
            console.log('SuenovaApiClient.ts: 124', response.data.choices)
            return response.data.choices.map(
                (choice: any) =>
                    new AIMessage({
                        content: choice.message.content,
                        tool_calls: choice.message.tool_calls,
                        name: choice.message.name
                    })
            )
        })
    }

    /**
     * Generate text using the Suenova API.
     * @param params - Parameters for text generation.
     */
    async generateText(params: GenerateTextParams): Promise<SuenovaApiResponse> {
        var inTools = []
        for (var i = 0; i < this.tools.length; i++) {
            if (this.tools[i]) inTools.push(this.tools[i])
        }
        const payload = {
            model: this.deploymentName,
            messages: [{ role: 'user', content: params.prompt }],
            temperature: params.temperature ?? 0.7,
            tools: inTools
            // Include other parameters as needed
        }
        console.log('SuenovaApiClient.ts: 126', payload)
        try {
            const response: AxiosResponse<any> = await this.axiosInstance.post(`/engines/${this.deploymentName}/chat/completions`, payload)
            return { success: true, content: response.data }
        } catch (error: any) {
            if (error.code === 'ECONNABORTED') {
                console.error('Request timed out:', error.message)
            } else if (error.response) {
                console.error(
                    `HTTP error! Status: ${error.response.status} - ${error.response.statusText}\nResponse: ${error.response.data}`
                )
            } else {
                console.error('An error occurred:', error.message)
            }
            return { success: false, content: null }
        }
    }
}
