import TransparentUpgradeableProxy from '@openzeppelin/contracts/build/contracts/TransparentUpgradeableProxy.json'
import createDeployContractStep from './meta/createDeployContractStep'

export const DEPLOY_TRANSPARENT_PROXY_DESCRIPTOR = createDeployContractStep({
  key: 'descriptorProxyAddress',
  artifact: TransparentUpgradeableProxy,
  computeArguments(state) {
    if (state.nonfungibleTokenPositionDescriptorAddress === undefined) {
      throw new Error('Missing NonfungibleTokenPositionDescriptor')
    }
    if (state.proxyAdminAddress === undefined) {
      throw new Error('Missing ProxyAdmin')
    }
    return [state.nonfungibleTokenPositionDescriptorAddress, state.proxyAdminAddress, '0x']
  },
})
