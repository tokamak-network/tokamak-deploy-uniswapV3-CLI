import { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { migrate } from './migrate'
import { MigrationState, MigrationStep, StepOutput } from './migrations'
import { ADD_1BP_FEE_TIER } from './steps/add-1bp-fee-tier'
import { DEPLOY_MULTICALL2 } from './steps/deploy-multicall2'
import { DEPLOY_NFT_DESCRIPTOR_LIBRARY } from './steps/deploy-nft-descriptor-library'
import { DEPLOY_NFT_POSITION_DESCRIPTOR } from './steps/deploy-nft-position-descriptor'
import { DEPLOY_NONFUNGIBLE_POSITION_MANAGER } from './steps/deploy-nonfungible-position-manager'
import { DEPLOY_PROXY_ADMIN } from './steps/deploy-proxy-admin'
import { DEPLOY_QUOTER_V2 } from './steps/deploy-quoter-v2'
import { DEPLOY_TICK_LENS } from './steps/deploy-tick-lens'
import { DEPLOY_TRANSPARENT_PROXY_DESCRIPTOR } from './steps/deploy-transparent-proxy-descriptor'
import { DEPLOY_V3_CORE_FACTORY } from './steps/deploy-v3-core-factory'
import { DEPLOY_V3_SWAP_ROUTER_02 } from './steps/deploy-v3-swap-router-02'
import { TRANSFER_PROXY_ADMIN } from './steps/transfer-proxy-admin'
import { TRANSFER_V3_CORE_FACTORY_OWNER } from './steps/transfer-v3-core-factory-owner'
import { DEPLOY_PERMIT2 } from './steps/deploy-permit2'
import { DEPLOY_UNSUPPORTED } from './steps/deploy-unsupported-protocol'
import { DEPLOY_UNIVERSAL_ROUTER } from './steps/deploy-universal-router'

const MIGRATION_STEPS: MigrationStep[] = [
  // must come first, for address calculations
  DEPLOY_V3_CORE_FACTORY,
  ADD_1BP_FEE_TIER,
  DEPLOY_MULTICALL2,
  DEPLOY_PROXY_ADMIN,
  DEPLOY_TICK_LENS,
  DEPLOY_NFT_DESCRIPTOR_LIBRARY,
  DEPLOY_NFT_POSITION_DESCRIPTOR,
  DEPLOY_TRANSPARENT_PROXY_DESCRIPTOR,
  DEPLOY_NONFUNGIBLE_POSITION_MANAGER,
  TRANSFER_V3_CORE_FACTORY_OWNER,
  DEPLOY_QUOTER_V2,
  DEPLOY_V3_SWAP_ROUTER_02,
  TRANSFER_PROXY_ADMIN,
  DEPLOY_PERMIT2,
  DEPLOY_UNSUPPORTED,
  DEPLOY_UNIVERSAL_ROUTER,
]

export default function deploy({
  signer,
  gasPrice: numberGasPrice,
  initialState,
  onStateChange,
  weth9Address,
  nativeCurrencyLabelBytes,
  v2CoreFactoryAddress,
  ownerAddress,
}: {
  signer: Signer
  gasPrice: number | undefined
  weth9Address: string
  nativeCurrencyLabelBytes: string
  v2CoreFactoryAddress: string
  ownerAddress: string
  initialState: MigrationState
  onStateChange: (newState: MigrationState) => Promise<void>
}): AsyncGenerator<StepOutput[], void, void> {
  const gasPrice =
    typeof numberGasPrice === 'number' ? BigNumber.from(numberGasPrice).mul(BigNumber.from(10).pow(9)) : undefined // convert to wei

  return migrate({
    steps: MIGRATION_STEPS,
    config: { gasPrice, signer, weth9Address, nativeCurrencyLabelBytes, v2CoreFactoryAddress, ownerAddress },
    initialState,
    onStateChange,
  })
}
