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
import UniversalRouter from './abis/UniversalRouter.sol/UniversalRouter.json'
import createDeployContractStep from './meta/createDeployContractStep'

export const DEPLOY_UNIVERSAL_ROUTER = createDeployContractStep({
  key: 'universalRouterAddress',
  artifact: UniversalRouter,
  computeArguments(state, config) {
    if (state.v3CoreFactoryAddress === undefined) {
      throw new Error('Missing V3 Core Factory')
    }
    if (state.permit2Address === undefined) {
      throw new Error('Missing Permit2 Address')
    }
    if (state.unsupportedAddress === undefined) {
      throw new Error('Missing Unsupported Address')
    }

    return [
      {
        permit2: state.permit2Address,
        weth9: config.weth9Address,
        seaportV1_5: state.unsupportedAddress,
        seaportV1_4: state.unsupportedAddress,
        openseaConduit: state.unsupportedAddress,
        nftxZap: state.unsupportedAddress,
        x2y2: state.unsupportedAddress,
        foundation: state.unsupportedAddress,
        sudoswap: state.unsupportedAddress,
        elementMarket: state.unsupportedAddress,
        nft20Zap: state.unsupportedAddress,
        cryptopunks: state.unsupportedAddress,
        looksRareV2: state.unsupportedAddress,
        routerRewardsDistributor: state.unsupportedAddress,
        looksRareRewardsDistributor: state.unsupportedAddress,
        looksRareToken: state.unsupportedAddress,
        v2Factory: config.v2CoreFactoryAddress,
        v3Factory: state.v3CoreFactoryAddress,
        pairInitCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
        poolInitCodeHash: '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54',
      },
    ]
  },
})
