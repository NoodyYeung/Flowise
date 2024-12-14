import { INodeParams, INodeCredential } from '../src/Interface'

class SuenovaApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Suenova API'
        this.name = 'suenovaApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Suenova Api Key',
                name: 'suenovaApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SuenovaApi }
