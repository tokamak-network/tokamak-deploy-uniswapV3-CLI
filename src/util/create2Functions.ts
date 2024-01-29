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
import { ethers, BigNumber, BigNumberish } from 'ethers'
import BN from 'bn.js'
import { TransactionRequest } from '@ethersproject/providers'
import { isHexString, arrayify, keccak256, solidityKeccak256 } from 'ethers/lib/utils'
import { exit } from 'process'

type Address = string
const ibanLookup: { [character: string]: string } = {}

function log10(x: number): number {
  if (Math.log10) {
    return Math.log10(x)
  }
  return Math.log(x) / Math.LN10
}
// Shims for environments that are missing some required constants and functions
const MAX_SAFE_INTEGER: number = 0x1fffffffffffff
const safeDigits = Math.floor(log10(MAX_SAFE_INTEGER))

function ibanChecksum(address: string): string {
  address = address.toUpperCase()
  address = address.substring(4) + address.substring(0, 2) + '00'

  let expanded = address
    .split('')
    .map((c) => {
      return ibanLookup[c]
    })
    .join('')

  // Javascript can handle integers safely up to 15 (decimal) digits
  while (expanded.length >= safeDigits) {
    let block = expanded.substring(0, safeDigits)
    expanded = (parseInt(block, 10) % 97) + expanded.substring(block.length)
  }

  let checksum = String(98 - (parseInt(expanded, 10) % 97))
  while (checksum.length < 2) {
    checksum = '0' + checksum
  }

  return checksum
}
function getChecksumAddress(address: string): string {
  if (!isHexString(address, 20)) {
    console.log('invalid address', 'address', address)
    exit(1)
  }

  address = address.toLowerCase()

  const chars = address.substring(2).split('')

  const expanded = new Uint8Array(40)
  for (let i = 0; i < 40; i++) {
    expanded[i] = chars[i].charCodeAt(0)
  }

  const hashed = arrayify(keccak256(expanded))

  for (let i = 0; i < 40; i += 2) {
    if (hashed[i >> 1] >> 4 >= 8) {
      chars[i] = chars[i].toUpperCase()
    }
    if ((hashed[i >> 1] & 0x0f) >= 8) {
      chars[i + 1] = chars[i + 1].toUpperCase()
    }
  }

  return '0x' + chars.join('')
}

// value should have no prefix
export function _base36To16(value: string): string {
  return new BN(value, 36).toString(16)
}

function getAddress(address: string): string {
  let result = null

  if (typeof address !== 'string') {
    console.log('invalid address', 'address', address)
    exit(1)
  }

  if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
    // Missing the 0x prefix
    if (address.substring(0, 2) !== '0x') {
      address = '0x' + address
    }

    result = getChecksumAddress(address)

    // It is a checksummed address with a bad checksum
    if (address.match(/([A-F].*[a-f])|([a-f].*[A-F])/) && result !== address) {
      console.log('bad address checksum', 'address', address)
      exit(1)
    }

    // Maybe ICAP? (we only support direct mode)
  } else if (address.match(/^XE[0-9]{2}[0-9A-Za-z]{30,31}$/)) {
    // It is an ICAP address with a bad checksum
    if (address.substring(2, 4) !== ibanChecksum(address)) {
      console.log('bad icap checksum', 'address', address)
      exit(1)
    }

    result = _base36To16(address.substring(4))
    while (result.length < 40) {
      result = '0' + result
    }
    result = getChecksumAddress('0x' + result)
  } else {
    console.log('invalid address', 'address', address)
    exit(1)
  }

  return result as string
}

export async function calculateEvmCreate2Address(
  create2DeployerAddress: Address,
  salt: string,
  deploymentTx: TransactionRequest
): Promise<Address> {
  if (typeof deploymentTx.data !== 'string') throw Error('unsigned tx data as bytes not supported')
  return getAddress(
    '0x' +
      solidityKeccak256(
        ['bytes'],
        [
          `0xff${create2DeployerAddress.slice(2)}${salt.slice(2)}${solidityKeccak256(
            ['bytes'],
            [deploymentTx.data]
          ).slice(2)}`,
        ]
      ).slice(-40)
  )
}

function bnReplacer(_k: string, v: any): any {
  if (typeof v === 'bigint') {
    return v.toString()
  }
  return v
}

export async function handleSpecificErrors<T>(p: Promise<T>): Promise<T> {
  let result: T
  try {
    result = await p
  } catch (e) {
    if (typeof (e as any).message === 'string' && (e as any).message.indexOf('already known') !== -1) {
      console.log(
        `
  Exact same transaction already in the pool, node reject duplicates.
  You'll need to wait the tx resolve, or increase the gas price via --gasprice (this will use old tx type)
          `
      )
      throw new Error('Exact same transaction already in the pool, node reject duplicates')
      // console.log(
      //   `\nExact same transaction already in the pool, node reject duplicates, waiting for it instead...\n`
      // );
      // const signedTx = await ethersSigner.signTransaction(unsignedTx);
      // const decoded = parseTransaction(signedTx);
      // if (!decoded.hash) {
      //   throw new Error(
      //     'tx with same hash already in the pool, failed to decode to get the hash'
      //   );
      // }
      // const txHash = decoded.hash;
      // tx = Object.assign(decoded as TransactionResponse, {
      //   wait: (confirmations: number) =>
      //     provider.waitForTransaction(txHash, confirmations),
      //   confirmations: 0,
      // });
    } else {
      console.error((e as any).message, JSON.stringify(e, bnReplacer), e)
      throw e
    }
  }
  return result
}
