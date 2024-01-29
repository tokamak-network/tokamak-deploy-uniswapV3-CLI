import NonfungibleTokenPositionDescriptor from '@uniswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json'
import createDeployContractStep from './meta/createDeployContractStep'

export const DEPLOY_NFT_POSITION_DESCRIPTOR = createDeployContractStep({
  key: 'nonfungibleTokenPositionDescriptorAddress',
  artifact: NonfungibleTokenPositionDescriptor,
  computeLibraries(state) {
    if (state.nftDescriptorLibraryAddress === undefined) {
      throw new Error('NFTDescriptor library missing')
    }
    return {
      NFTDescriptor: state.nftDescriptorLibraryAddress,
    }
  },
  computeArguments(_, { weth9Address, nativeCurrencyLabelBytes }) {
    return [weth9Address, nativeCurrencyLabelBytes]
  },
})
