// Copyright 2024 justin
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Contract, ContractInterface, ContractFactory } from '@ethersproject/contracts'
import { MigrationConfig, MigrationState, MigrationStep } from '../../migrations'
import linkLibraries from '../../util/linkLibraries'
import { deployContract, deployFactory, getCreate2Address, isDeployed } from '@ubeswap/solidity-create2-deployer'
import { ethers } from 'ethers'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { handleSpecificErrors, calculateEvmCreate2Address } from '../../util/create2Functions'
type ConstructorArgs = (string | number | string[] | number[])[]

export default function create2DeployContractStep({
  key,
  artifact: { contractName, abi, bytecode, linkReferences },
  computeLibraries,
  computeArguments,
}: {
  key: keyof MigrationState
  artifact: {
    contractName: string
    abi: ContractInterface
    bytecode: string
    linkReferences?: { [fileName: string]: { [contractName: string]: { length: number; start: number }[] } }
  }
  computeLibraries?: (state: Readonly<MigrationState>, config: MigrationConfig) => { [libraryName: string]: string }
  computeArguments?: (state: Readonly<MigrationState>, config: MigrationConfig) => ConstructorArgs
}): MigrationStep {
  if (linkReferences && Object.keys(linkReferences).length > 0 && !computeLibraries) {
    throw new Error('Missing function to compute library addresses')
  } else if (computeLibraries && (!linkReferences || Object.keys(linkReferences).length === 0)) {
    throw new Error('Compute libraries passed but no link references')
  }
  return async (state, config) => {
    if (state[key] === undefined) {
      const constructorArgs: ConstructorArgs = computeArguments ? computeArguments(state, config) : []

      const factory = new ContractFactory(
        abi,
        linkReferences && computeLibraries
          ? linkLibraries({ bytecode, linkReferences }, computeLibraries(state, config))
          : bytecode,
        config.signer
      )

      try {
        //contract = await factory.deploy(...constructorArgs, { gasPrice: config.gasPrice })
        // const { txHash, address, receipt } = await deployContract({
        //   salt: '0x00000000000000000000000000000000000000005eb67581652632000a6cbedf',
        //   contractBytecode:
        //     linkReferences && computeLibraries
        //       ? linkLibraries({ bytecode, linkReferences }, computeLibraries(state, config))
        //       : bytecode,
        //   signer: config.signer as ethers.Signer,
        // })

        const unsignedTx = await factory.getDeployTransaction(...constructorArgs, { gasPrice: config.gasPrice })
        unsignedTx.data =
          '0x00000000000000000000000000000000000000005eb67581652632000a6cbedf' + (unsignedTx.data! as string).slice(2)
        unsignedTx.to = '0x4e59b44847b379578588920ca78fbf26c0b4956c'
        //await overrideGasLimit(unsignedTx, options, (newOverrides) => config.signer.estimateGas(newOverrides))
        // unsignedTx.gasLimit = 2797229
        // const gasPriceSetup = await config.signer.provider?.getFeeData()
        // //unsignedTx.gasPrice = gasPriceSetup?.gasPrice?.toString()
        // unsignedTx.maxFeePerGas = gasPriceSetup?.maxFeePerGas?.toString()
        // unsignedTx.maxPriorityFeePerGas = gasPriceSetup?.maxPriorityFeePerGas?.toString()
        // unsignedTx.nonce = await config.signer.getTransactionCount('latest')

        let tx = (await handleSpecificErrors(config.signer.sendTransaction(unsignedTx))) as TransactionResponse
        console.log(` (tx: ${tx.hash})...`)
        const receipt = await tx.wait()
        const create2Address = await calculateEvmCreate2Address(
          '0x4e59b44847b379578588920ca78fbf26c0b4956c',
          '0x00000000000000000000000000000000000000005eb67581652632000a6cbedf',
          unsignedTx
        )

        state[key] = create2Address

        return [
          {
            message: `Contract ${contractName} deployed`,
            address: create2Address,
            hash: tx.hash,
          },
        ]
      } catch (error) {
        console.error(`Failed to deploy ${contractName}`)
        throw error
      }
    } else {
      return [{ message: `Contract ${contractName} was already deployed`, address: state[key] }]
    }
  }
}
