// src/nodes/SuenovaChatModel.ts

import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { IMultiModalOption } from '../../../src/Interface' // Adjust the import path as needed
import { SuenovaApiClient } from '../../llms/Suenova/SuenovaApiClient'
import { BaseLLM, BaseLLMParams } from '@langchain/core/language_models/llms'
import { LLMResult } from '@langchain/core/outputs'

interface SuenovaLLMParams extends BaseLLMParams {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stop?: string[]
    disableSSL?: boolean

    // Add any additional parameters as needed
}

export class SuenovaLLM extends BaseLLM {
    client: SuenovaApiClient
    params: SuenovaLLMParams
    multiModalOption?: IMultiModalOption
    configuredModel?: string
    configuredMaxToken?: number
    id?: string

    constructor(client: SuenovaApiClient, params: SuenovaLLMParams) {
        super(params)
        this.client = client
        this.params = params
    }

    _llmType() {
        return 'suenova-llm'
    }

    /**
     * Sets the multimodal options for the LLM.
     * @param options IMultiModalOption
     */
    setMultiModalOption(options: IMultiModalOption) {
        this.multiModalOption = options
    }

    /**
     * Core method to call the LLM.
     * @param prompt The input prompt for the LLM.
     * @param runManager Callback manager for handling tokens and events.
     * @returns The generated text.
     */
    async _call(prompt: string, options: this['ParsedCallOptions'], runManager?: CallbackManagerForLLMRun | undefined): Promise<string> {
        // Handle multimodal inputs if applicable
        if (this.multiModalOption?.image?.allowImageUploads) {
            // Implement image processing if necessary
            // Example:
            // const imageUrl = await uploadImage(someImageData);
            // prompt += ` Image URL: ${imageUrl}`;
        }

        // Merge parameters
        const params = {
            prompt,
            temperature: this.params.temperature,
            maxTokens: this.params.maxTokens,
            topP: this.params.topP,
            frequencyPenalty: this.params.frequencyPenalty,
            presencePenalty: this.params.presencePenalty,
            stop: this.params.stop,
            disableSSL: this.params.disableSSL
            // Add any additional parameters here
        }

        // Generate text response
        const response = await this.client.generateText(params)

        if (response.success && response.content) {
            const content = response.content.choices?.[0]?.message.content || ''
            console.log('SuenovaLLM._call 82: content: ', response.content.choices?.[0])
            return content
        } else {
            throw new Error('Failed to generate text from Suenova API.')
        }
    }

    /**
     * Generates multiple completions for a single prompt.
     * @param prompts Array of input prompts.
     * @param runManager Callback manager.
     * @returns An LLMResult containing generations for each prompt.
     */
    async _generate(
        inputs: string[],
        options: this['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun | undefined
    ): Promise<LLMResult> {
        const generations = []
        for (const input of inputs) {
            const text = await this._call(input, options, runManager)
            generations.push([{ text }])
        }
        return { generations }
    }

    /**
     * Returns the parameters of the LLM.
     * @returns An object containing the parameters.
     */
    getParamKeys(): string[] {
        return [
            'temperature',
            'maxTokens',
            'topP',
            'frequencyPenalty',
            'presencePenalty',
            'stop',
            'disableSSL'
            // Add any additional parameter keys here
        ]
    }
}
