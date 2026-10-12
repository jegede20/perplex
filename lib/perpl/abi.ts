import type { Abi } from 'viem';

// ═══════════════════════════════════════════════════════════════════
// Perpl Exchange — read-only view ABI
// Contract: 0x34B6552d57a35a1D042CcAe1951BD1C370112a6F (Monad mainnet)
//
// Mirrors the documented Perpl Exchange view surface:
//   getPositionsV2(marketId), getPerpetualInfoV2(marketId),
//   getLiquidationInfo(), getMarginFractions(address),
//   getAccountByAddr(address), getPosition(address, marketId)
//
// Fixed-point values (prices, sizes, collateral) use 18-decimal scaling,
// standard for Monad/Perpl. Decoding is defensive: contracts.ts validates
// every field and degrades to null on any mismatch rather than throwing.
// ═══════════════════════════════════════════════════════════════════

export const PERPL_EXCHANGE_ABI = [
  {
    type: 'function',
    name: 'getPositionsV2',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'start', type: 'uint256' },
      { name: 'end', type: 'uint256' },
    ],
    outputs: [
      {
        name: 'positions',
        type: 'tuple[]',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'marketId', type: 'uint256' },
          { name: 'isLong', type: 'bool' },
          { name: 'size', type: 'uint256' },
          { name: 'entryPrice', type: 'uint256' },
          { name: 'margin', type: 'uint256' },
          { name: 'liquidationPrice', type: 'uint256' },
          { name: 'lastCumulativeFunding', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getPerpetualInfoV2',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'markPrice', type: 'uint256' },
          { name: 'spotPrice', type: 'uint256' },
          { name: 'openInterestLong', type: 'uint256' },
          { name: 'openInterestShort', type: 'uint256' },
          { name: 'fundingRate', type: 'int256' },
          { name: 'fundingTimestamp', type: 'uint256' },
          { name: 'maxLeverage', type: 'uint256' },
          { name: 'maintenanceMarginFraction', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getLiquidationInfo',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'insuranceFundBalance', type: 'uint256' },
          { name: 'liquidatorShareBps', type: 'uint256' },
          { name: 'insuranceShareBps', type: 'uint256' },
          { name: 'backstopShareBps', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getMarginFractions',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      {
        name: 'fractions',
        type: 'tuple',
        components: [
          { name: 'marginRatio', type: 'uint256' },
          { name: 'maintenanceMarginFraction', type: 'uint256' },
          { name: 'initialMarginFraction', type: 'uint256' },
          { name: 'collateralValue', type: 'uint256' },
          { name: 'accountValue', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getAccountByAddr',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      {
        name: 'accountInfo',
        type: 'tuple',
        components: [
          { name: 'collateralBalance', type: 'uint256' },
          { name: 'accountValue', type: 'uint256' },
          { name: 'totalPositionValue', type: 'uint256' },
          { name: 'lastUpdateTimestamp', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getPosition',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'marketId', type: 'uint256' },
    ],
    outputs: [
      {
        name: 'position',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'marketId', type: 'uint256' },
          { name: 'isLong', type: 'bool' },
          { name: 'size', type: 'uint256' },
          { name: 'entryPrice', type: 'uint256' },
          { name: 'margin', type: 'uint256' },
          { name: 'liquidationPrice', type: 'uint256' },
          { name: 'lastCumulativeFunding', type: 'uint256' },
        ],
      },
    ],
  },
] as const satisfies Abi;
