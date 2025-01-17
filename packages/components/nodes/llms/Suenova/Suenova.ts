// src/nodes/Suenova_LLMs.ts
import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { MODEL_TYPE } from '../../../src/modelLoader'
import { SuenovaApiClient } from './SuenovaApiClient'
import { getModels } from '../../../src/modelLoader'
import { SuenovaLLM } from './SuenovaLLM'

class Suenova implements INode {
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
        this.label = 'Suenova'
        this.name = 'suenova'
        this.version = 1.0
        this.type = 'SuenovaAPI'
        this.icon = 'suenova.svg' // Ensure you have this icon in your assets
        this.category = 'LLMs'
        this.description = 'Wrapper around the Suenova on-premise large language model API'
        this.baseClasses = [this.type, ...getBaseClasses(SuenovaLLM)]
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
                default: 'Qwen2.5-32B-Instruct' // Default to your deployment name
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
                label: 'Best Of',
                name: 'bestOf',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Batch Size',
                name: 'batchSize',
                type: 'number',
                step: 1,
                optional: true,
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
                default: 'https://litellm.suanovalab.duckdns.org', // Your on-premise server
                optional: false
            },
            {
                label: 'Disable SSL Verification',
                name: 'disableSSL',
                type: 'boolean',
                default: false,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.LLM, 'suenova')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as number
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as number
        const topP = nodeData.inputs?.topP as number
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as number
        const presencePenalty = nodeData.inputs?.presencePenalty as number
        const bestOf = nodeData.inputs?.bestOf as number
        const batchSize = nodeData.inputs?.batchSize as number
        const timeout = nodeData.inputs?.timeout as number
        const basePath = nodeData.inputs?.basePath as string
        const disableSSL = nodeData.inputs?.disableSSL as boolean
        const cache = nodeData.inputs?.cache as BaseCache

        // Retrieve credentials
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('suenovaApiKey', credentialData, nodeData)

        // Initialize the Suenova API client
        const client = new SuenovaApiClient(
            {
                basePath,
                apiKey,
                timeout,
                disableSSL
            },
            modelName
        )

        // Set up LLM parameters
        const llmParams: BaseLLMParams & {
            temperature?: number
            maxTokens?: number
            topP?: number
            frequencyPenalty?: number
            presencePenalty?: number
            bestOf?: number
            batchSize?: number
        } = {
            temperature
        }

        if (maxTokens) llmParams.maxTokens = maxTokens
        if (topP) llmParams.topP = topP
        if (frequencyPenalty) llmParams.frequencyPenalty = frequencyPenalty
        if (presencePenalty) llmParams.presencePenalty = presencePenalty
        if (bestOf) llmParams.bestOf = bestOf
        if (batchSize) llmParams.batchSize = batchSize

        if (cache) llmParams.cache = cache

        // Define the generate function
        const model = new SuenovaLLM(client, llmParams)
        // Return an object that conforms to LangChain's expected interface
        return model
    }
}

module.exports = { nodeClass: Suenova }
