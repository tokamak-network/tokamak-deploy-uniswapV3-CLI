import { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { GenericMigrationStep } from './migrate'

export interface MigrationState {
  readonly v3CoreFactoryAddress?: string
  readonly swapRouter02?: string
  readonly nftDescriptorLibraryAddress?: string
  readonly nonfungibleTokenPositionDescriptorAddress?: string
  readonly descriptorProxyAddress?: string
  readonly multicall2Address?: string
  readonly proxyAdminAddress?: string
  readonly quoterV2Address?: string
  readonly tickLensAddress?: string
  readonly nonfungibleTokenPositionManagerAddress?: string
  readonly permit2Address?: string
  readonly unsupportedAddress?: string
  readonly universalRouterAddress?: string
}

export type StepOutput = { message: string; hash?: string; address?: string }

export type MigrationConfig = {
  signer: Signer
  gasPrice: BigNumber | undefined
  weth9Address: string
  nativeCurrencyLabelBytes: string
  v2CoreFactoryAddress: string
  ownerAddress: string
}

export type MigrationStep = GenericMigrationStep<MigrationState, MigrationConfig, StepOutput[]>
