// src/nodes/ChatSuenova.ts
import { BaseCache } from '@langchain/core/caches'
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { SuenovaChatModel } from './SuenovaChatModel' // Newly created class
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SuenovaApiClient } from '../../llms/Suenova/SuenovaApiClient'

class ChatSuenova implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'SuenovaChat'
        this.name = 'suenovaChat'
        this.version = 1.0
        this.type = 'SuenovaChat'
        this.icon = 'suenova.svg' // Ensure this icon is available in your assets
        this.category = 'Chat Models'
        this.description = 'Wrapper around Suenova on-premise large language model API for chat interactions'
        this.baseClasses = [this.type, ...getBaseClasses(SuenovaChatModel)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['suenovaApi'] // Ensure this credential is defined
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'Qwen2.5-7B-Instruct' // Replace with your default chat model name
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: false,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top Probability',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Stop Sequence',
                name: 'stopSequence',
                type: 'string',
                rows: 4,
                optional: true,
                description: 'List of stop words to use when generating. Use comma to separate multiple stop words.',
                additionalParams: true
            },
            {
                label: 'Timeout (ms)',
                name: 'timeout',
                type: 'number',
                step: 1000,
                default: 180000,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Base Path',
                name: 'basePath',
                type: 'string',
                default: 'https://113.31.112.216:8001', // Replace with your Suenova server URL
                optional: false
            },
            {
                label: 'Proxy Url',
                name: 'proxyUrl',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'BaseOptions',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Allow Image Uploads',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Allow image input. Refer to the <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">docs</a> for more details.',
                default: false,
                optional: true
            },
            {
                label: 'Image Resolution',
                description: 'This parameter controls the resolution in which the model views the image.',
                name: 'imageResolution',
                type: 'options',
                options: [
                    {
                        label: 'Low',
                        name: 'low'
                    },
                    {
                        label: 'High',
                        name: 'high'
                    },
                    {
                        label: 'Auto',
                        name: 'auto'
                    }
                ],
                default: 'low',
                optional: false,
                additionalParams: true
            },
            {
                label: 'Disable SSL Verification',
                name: 'disableSSL',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'suenovaChat')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as number
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as number
        const topP = nodeData.inputs?.topP as number
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as number
        const presencePenalty = nodeData.inputs?.presencePenalty as number
        const stopSequence = nodeData.inputs?.stopSequence as string
        const timeout = nodeData.inputs?.timeout as number
        const basePath = nodeData.inputs?.basePath as string
        const proxyUrl = nodeData.inputs?.proxyUrl as string
        const baseOptions = nodeData.inputs?.baseOptions
        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean
        const imageResolution = nodeData.inputs?.imageResolution as string
        const streaming = nodeData.inputs?.streaming as boolean
        const cache = nodeData.inputs?.cache as BaseCache
        const disableSSL = nodeData.inputs?.disableSSL as boolean

        // Retrieve credentials
        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('suenovaApiKey', credentialData, nodeData)

        // Initialize the Suenova Chat API client
        const clientConfig: any = {
            apiKey,
            basePath,
            timeout,
            disableSSL: (nodeData.inputs?.disableSSL as boolean) || true
        }

        // Handle proxy configuration
        if (proxyUrl) {
            clientConfig.httpAgent = new HttpsProxyAgent(proxyUrl)
        }

        // Handle baseOptions
        if (baseOptions) {
            try {
                const parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
                Object.assign(clientConfig, parsedBaseOptions)
            } catch (exception) {
                throw new Error("Invalid JSON in the Suenova Chat's BaseOptions: " + exception)
            }
        }

        const client = new SuenovaApiClient(clientConfig, modelName)

        // Set up chat model parameters
        const chatModelParams: BaseChatModelParams & {
            temperature?: number
            maxTokens?: number
            topP?: number
            frequencyPenalty?: number
            presencePenalty?: number
            stop?: string[]
        } = {
            temperature
            // Additional parameters will be set below
        }

        if (maxTokens) chatModelParams.maxTokens = maxTokens
        if (topP) chatModelParams.topP = topP
        if (frequencyPenalty) chatModelParams.frequencyPenalty = frequencyPenalty
        if (presencePenalty) chatModelParams.presencePenalty = presencePenalty
        if (stopSequence) {
            chatModelParams.stop = stopSequence.split(',').map((item) => item.trim())
        }
        if (cache) chatModelParams.cache = cache

        // Initialize the custom SuenovaChatModel
        const suenovaChatModel = new SuenovaChatModel(client, {
            temperature,
            maxTokens,
            topP,
            frequencyPenalty,
            presencePenalty,
            stop: chatModelParams.stop,
            disableSSL: disableSSL
            // Add any additional parameters as needed
        })

        // Configure multimodal options if necessary
        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false,
                imageResolution
            }
        }
        suenovaChatModel.setMultiModalOption(multiModalOption)

        return suenovaChatModel
    }
}

module.exports = { nodeClass: ChatSuenova }
