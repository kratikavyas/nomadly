import { useState, useEffect, useCallback } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

const { Api } = StellarSdk.rpc;

// ===== Configuration =====
const CONTRACT_ADDRESS = "CCE5FDUO6XXLADYTMERIZDVASJKUQUTKY6HX2S7V2ENG4UKBF44CZEIV";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

// ===== Stellar SDK Helpers =====
const server = new StellarSdk.rpc.Server(RPC_URL, { allowHttp: true });

function contractContract() {
  return new StellarSdk.Contract(CONTRACT_ADDRESS);
}

// ScVal converters
function toScValString(v: string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v, { type: "string" });
}

function toScValU32(v: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v, { type: "u32" });
}

function toScValU64(v: bigint): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v, { type: "u64" });
}

function toScValI128(v: bigint): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v, { type: "i128" });
}

function toScValAddress(v: string): StellarSdk.xdr.ScVal {
  return new StellarSdk.Address(v).toScVal();
}

function scValToNative<T>(sv: StellarSdk.xdr.ScVal): T {
  return StellarSdk.scValToNative(sv) as T;
}

// ===== Contract Call Helpers =====
async function readContract(
  method: string,
  args: StellarSdk.xdr.ScVal[] = [],
  source?: string
): Promise<StellarSdk.xdr.ScVal> {
  const contract = contractContract();
  const account = await server.getAccount(source || CONTRACT_ADDRESS);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(StellarSdk.TimeoutInfinite)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${JSON.stringify(simResult)}`);
  }
  return (simResult as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse)
    .result!.retval;
}

async function callContract(
  method: string,
  args: StellarSdk.xdr.ScVal[],
  sourceAccount: string,
  signAndSend: boolean = false
): Promise<any> {
  const contract = contractContract();
  const account = await server.getAccount(sourceAccount);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(StellarSdk.TimeoutInfinite)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${JSON.stringify(simResult)}`);
  }

  if (!signAndSend) return simResult;

  const assembledTx = StellarSdk.rpc
    .assembleTransaction(tx, simResult)
    .build();
  const signedResult = await signTransaction(assembledTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  const signedXdr =
    typeof signedResult === "string"
      ? signedResult
      : signedResult.signedTxXdr;
  const result = await server.sendTransaction(
    StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    ) as StellarSdk.Transaction
  );
  return result;
}

// ===== Types =====
export interface Experience {
  id: bigint;
  host: string;
  title: string;
  description: string;
  location: string;
  category: string;
  price: bigint;
  max_participants: number;
  active: boolean;
}

export interface Booking {
  id: bigint;
  experience_id: bigint;
  traveler: string;
  num_participants: number;
  total_paid: bigint;
  token: string;
  status: "Confirmed" | "Cancelled" | "Completed";
}

export interface Review {
  id: bigint;
  experience_id: bigint;
  traveler: string;
  rating: number;
  comment: string;
}

// ===== Wallet Hook =====
export function useWallet() {
  const [address, setAddress] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const conn = await isConnected();
      const allowed = await isAllowed();
      if (conn.isConnected && allowed.isAllowed) {
        const addr = await getAddress();
        setAddress(addr.address);
        setConnected(true);
      }
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = async () => {
    setLoading(true);
    try {
      await requestAccess();
      const addr = await getAddress();
      setAddress(addr.address);
      setConnected(true);
    } catch (e) {
      console.error("Failed to connect:", e);
    } finally {
      setLoading(false);
    }
  };

  return { address, connected, loading, connect, checkConnection };
}

// ===== Experience Functions =====
export async function createExperience(
  caller: string,
  title: string,
  description: string,
  location: string,
  category: string,
  price: bigint,
  maxParticipants: number
): Promise<string> {
  const result = await callContract(
    "create_experience",
    [
      toScValAddress(caller),
      toScValString(title),
      toScValString(description),
      toScValString(location),
      toScValString(category),
      toScValI128(price),
      toScValU32(maxParticipants),
    ],
    caller,
    true
  );
  return result.hash;
}

export async function updateExperience(
  caller: string,
  id: bigint,
  title: string,
  description: string,
  location: string,
  category: string,
  price: bigint,
  maxParticipants: number
): Promise<string> {
  const result = await callContract(
    "update_experience",
    [
      toScValAddress(caller),
      toScValU64(id),
      toScValString(title),
      toScValString(description),
      toScValString(location),
      toScValString(category),
      toScValI128(price),
      toScValU32(maxParticipants),
    ],
    caller,
    true
  );
  return result.hash;
}

export async function deactivateExperience(
  caller: string,
  id: bigint
): Promise<string> {
  const result = await callContract(
    "deactivate_experience",
    [toScValAddress(caller), toScValU64(id)],
    caller,
    true
  );
  return result.hash;
}

export async function getExperience(id: bigint): Promise<Experience> {
  const result = await readContract("get_experience", [toScValU64(id)]);
  return scValToNative<Experience>(result);
}

export async function getHostExperiences(host: string): Promise<bigint[]> {
  const result = await readContract("get_host_experiences", [
    toScValAddress(host),
  ]);
  return scValToNative<bigint[]>(result);
}

export async function getAllExperienceIds(): Promise<bigint[]> {
  const result = await readContract("get_all_experiences");
  return scValToNative<bigint[]>(result);
}

// ===== Booking Functions =====
export async function bookExperience(
  traveler: string,
  experienceId: bigint,
  tokenAddress: string,
  numParticipants: number
): Promise<string> {
  const result = await callContract(
    "book_experience",
    [
      toScValAddress(traveler),
      toScValU64(experienceId),
      toScValAddress(tokenAddress),
      toScValU32(numParticipants),
    ],
    traveler,
    true
  );
  return result.hash;
}

export async function cancelBooking(
  caller: string,
  bookingId: bigint
): Promise<string> {
  const result = await callContract(
    "cancel_booking",
    [toScValAddress(caller), toScValU64(bookingId)],
    caller,
    true
  );
  return result.hash;
}

export async function completeBooking(
  host: string,
  bookingId: bigint
): Promise<string> {
  const result = await callContract(
    "complete_booking",
    [toScValAddress(host), toScValU64(bookingId)],
    host,
    true
  );
  return result.hash;
}

export async function getBooking(id: bigint): Promise<Booking> {
  const result = await readContract("get_booking", [toScValU64(id)]);
  return scValToNative<Booking>(result);
}

export async function getTravelerBookings(
  traveler: string
): Promise<bigint[]> {
  const result = await readContract("get_traveler_bookings", [
    toScValAddress(traveler),
  ]);
  return scValToNative<bigint[]>(result);
}

// ===== Review Functions =====
export async function addReview(
  traveler: string,
  bookingId: bigint,
  rating: number,
  comment: string
): Promise<string> {
  const result = await callContract(
    "add_review",
    [
      toScValAddress(traveler),
      toScValU64(bookingId),
      toScValU32(rating),
      toScValString(comment),
    ],
    traveler,
    true
  );
  return result.hash;
}

export async function getReview(id: bigint): Promise<Review> {
  const result = await readContract("get_review", [toScValU64(id)]);
  return scValToNative<Review>(result);
}

export async function getExperienceReviews(
  experienceId: bigint
): Promise<bigint[]> {
  const result = await readContract("get_experience_reviews", [
    toScValU64(experienceId),
  ]);
  return scValToNative<bigint[]>(result);
}

// ===== Platform Functions =====
export async function getPlatformFee(): Promise<number> {
  const result = await readContract("get_platform_fee");
  return scValToNative<number>(result);
}
