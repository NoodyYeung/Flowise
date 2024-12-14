// src/nodes/SuenovaChatModel.ts
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatResult } from '@langchain/core/outputs'

import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { IMultiModalOption } from '../../../src/Interface' // Adjust the import path as needed
import { BaseLanguageModelParams } from '@langchain/core/language_models/base'
import { BaseMessage } from '@langchain/core/messages'
import { SuenovaApiClient } from '../../llms/Suenova/SuenovaApiClient'
import { ICommonObject, IVisionChatModal } from '../../../src'
import { StructuredToolInterface } from '@langchain/core/tools'

interface SuenovaChatModelParams extends BaseLanguageModelParams {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stop?: string[]
    disableSSL?: boolean

    // Add any additional parameters as needed
}

export class SuenovaChatModel extends BaseChatModel implements IVisionChatModal {
    client: SuenovaApiClient
    params: SuenovaChatModelParams
    configuredModel: string
    multiModalOption: IMultiModalOption
    configuredMaxToken?: number
    id: string

    constructor(client: SuenovaApiClient, params: SuenovaChatModelParams) {
        super(params)
        this.client = client
        this.params = params
    }

    _llmType() {
        return 'suenova-chat'
    }

    /**
     * Sets the multimodal options for the chat model.
     * @param options IMultiModalOption
     */
    setMultiModalOption(options: IMultiModalOption) {
        this.multiModalOption = options
    }

    async _call(prompt: string, options: this['ParsedCallOptions'], runManager?: CallbackManagerForLLMRun): Promise<string> {
        // Handle multimodal inputs if applicable
        if (this.multiModalOption?.image?.allowImageUploads) {
            // Implement image processing if necessary
            // This depends on how your Suenova API handles images
            // For example, you might need to upload the image and include a reference in the prompt
            // This is a placeholder for your actual implementation
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

        // Generate chat response
        const response = await this.client.generateText(params)

        if (response.success && response.content) {
            const content = response.content.choices?.[0]?.message?.content || ''
            return content
        } else {
            throw new Error('Failed to generate text from Suenova API.')
        }
    }

    override bindTools(tools: (StructuredToolInterface | Record<string, unknown>)[], kwargs?: Partial<ICommonObject>) {
        console.log('Binding tools', tools)
        //@ts-ignore
        return this.bind({ tools: tools, ...kwargs })
    }

    revertToOriginalModel(): void {}

    setVisionModel(): void {}

    _generate(messages: BaseMessage[], options: this['ParsedCallOptions'], runManager?: CallbackManagerForLLMRun): Promise<ChatResult> {
        const generate = async (messages: BaseMessage[], client: SuenovaApiClient): Promise<ChatResult> => {
            const chatMessages = await client.chat(messages)
            const generations = chatMessages.map((message) => {
                return {
                    text: message.content?.toString() ?? '',
                    message
                }
            })
            console.log('SuenovaChatModels.ts 116', chatMessages)
            console.log('SuenovaChatModels.ts 116', generations)
            await runManager?.handleLLMNewToken(generations.length ? generations[0].text : '')

            return {
                generations
            }
        }
        return generate(messages, this.client)
    }

    // async _generate(
    //     prompts: string[],
    //     options: this["ParsedCallOptions"],
    //     runManager?: CallbackManagerForLLMRun
    // ): Promise<ChatResult> {
    //     // Assuming batch processing is not supported
    //     const results: Generation[] = [];
    //     for (const prompt of prompts) {
    //         const text = await this._call(prompt, options, runManager);
    //         results.push({ text });
    //     }
    //     return { generations: [results] };
    // }
}
