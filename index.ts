import { program } from 'commander'
import { Wallet } from '@ethersproject/wallet'
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers'
import { AddressZero } from '@ethersproject/constants'
import { getAddress } from '@ethersproject/address'
import fs from 'fs'
import deploy from './src/deploy'
import { MigrationState } from './src/migrations'
import { asciiStringToBytes32 } from './src/util/asciiStringToBytes32'
import { version } from './package.json'

program
  .requiredOption('-pk, --private-key <string>', 'Private key used to deploy all contracts')
  .requiredOption('-j, --json-rpc <url>', 'JSON RPC URL where the program should be deployed')
  .requiredOption('-ncl, --native-currency-label <string>', 'Native currency label, e.g. ETH')
  .requiredOption(
    '-o, --owner-address <address>',
    'Contract address that will own the deployed artifacts after the script runs'
  )
  .option('-s, --state <path>', 'Path to the JSON file containing the migrations state (optional)', './state.json')
  .option('-g, --gas-price <number>', 'The gas price to pay in GWEI for each transaction (optional)')
  .option('-c, --confirmations <number>', 'How many confirmations to wait for after each transaction (optional)', '2')
  .on('--help', () => {
    console.log(
      '\nSince the native wrapped token is predeployed to a fixed address 0x4200000000000000000000000000000000000006, the parameter weth9 or wton is fixed to that address.\n'
    )
  })

program.name('npx @tokamak-network/deploy-v3').version(version).parse(process.argv)

if (!/^0x[a-zA-Z0-9]{64}$/.test(program.privateKey)) {
  console.error('Invalid private key!')
  process.exit(1)
}

let url: URL
try {
  url = new URL(program.jsonRpc)
} catch (error) {
  console.error('Invalid JSON RPC URL', (error as Error).message)
  process.exit(1)
}

let gasPrice: number | undefined
try {
  gasPrice = program.gasPrice ? parseInt(program.gasPrice) : undefined
} catch (error) {
  console.error('Failed to parse gas price', (error as Error).message)
  process.exit(1)
}

let confirmations: number
try {
  confirmations = parseInt(program.confirmations)
} catch (error) {
  console.error('Failed to parse confirmations', (error as Error).message)
  process.exit(1)
}

let nativeCurrencyLabelBytes: string
try {
  nativeCurrencyLabelBytes = asciiStringToBytes32(program.nativeCurrencyLabel)
} catch (error) {
  console.error('Invalid native currency label', (error as Error).message)
  process.exit(1)
}

let weth9Address: string = '0x4200000000000000000000000000000000000006'

let v2CoreFactoryAddress: string = AddressZero

let ownerAddress: string
try {
  ownerAddress = getAddress(program.ownerAddress)
} catch (error) {
  console.error('Invalid owner address', (error as Error).message)
  process.exit(1)
}

const wallet = new Wallet(program.privateKey, new JsonRpcProvider({ url: url.href }))

let state: MigrationState
if (fs.existsSync(program.state)) {
  try {
    state = JSON.parse(fs.readFileSync(program.state, { encoding: 'utf8' }))
  } catch (error) {
    console.error('Failed to load and parse migration state file', (error as Error).message)
    process.exit(1)
  }
} else {
  state = {}
}

let finalState: MigrationState
const onStateChange = async (newState: MigrationState): Promise<void> => {
  fs.writeFileSync(program.state, JSON.stringify(newState))
  finalState = newState
}

async function run() {
  let step = 1
  const results = []
  const generator = deploy({
    signer: wallet,
    gasPrice,
    nativeCurrencyLabelBytes,
    v2CoreFactoryAddress,
    ownerAddress,
    weth9Address,
    initialState: state,
    onStateChange,
  })

  for await (const result of generator) {
    console.log(`Step ${step++} complete`, result)
    results.push(result)

    // wait 15 minutes for any transactions sent in the step
    await Promise.all(
      result.map(
        (stepResult): Promise<TransactionReceipt | true> => {
          if (stepResult.hash) {
            return wallet.provider.waitForTransaction(stepResult.hash, confirmations, /* 15 minutes */ 1000 * 60 * 15)
          } else {
            return Promise.resolve(true)
          }
        }
      )
    )
  }

  return results
}

run()
  .then((results) => {
    console.log('Deployment succeeded')
    console.log(JSON.stringify(results))
    console.log('Final state')
    console.log(JSON.stringify(finalState))
    process.exit(0)
  })
  .catch((error) => {
    console.error('Deployment failed', error)
    console.log('Final state')
    console.log(JSON.stringify(finalState))
    process.exit(1)
  })
