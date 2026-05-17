import { db } from "@/lib/firebase";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { normalizePhone, log } from "@/lib/utils";
import type {
  Customer,
  CustomerCreateInput,
  ServiceResult,
  Category,
  ClientType,
} from "@/types";

const COLLECTION = "customers";

function fromFirestore(id: string, data: FirebaseFirestore.DocumentData): Customer {
  return {
    id,
    phone: (data.phone as string) ?? "",
    name: (data.name as string | null) ?? null,
    usualClientType: (data.usualClientType as ClientType) ?? "desconocido",
    lastClientType: (data.lastClientType as ClientType) ?? "desconocido",
    recurrent: (data.recurrent as boolean) ?? false,
    blocked: (data.blocked as boolean) ?? false,
    priorityScore: (data.priorityScore as number) ?? 0,
    favoriteCategories: (data.favoriteCategories as Category[]) ?? [],
    lastCategory: (data.lastCategory as Category | null) ?? null,
    lastCatalogSent: (data.lastCatalogSent as string | null) ?? null,
    summary: (data.summary as string) ?? "",
    lastInteractionAt: (data.lastInteractionAt as Timestamp | null) ?? null,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

export async function findCustomerByPhone(
  rawPhone: string
): Promise<Customer | null> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return null;

  const ref = db.collection(COLLECTION).doc(phone);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return fromFirestore(snap.id, snap.data()!);
}

export async function createCustomer(
  input: CustomerCreateInput
): Promise<ServiceResult<Customer>> {
  const phone = normalizePhone(input.phone);
  if (!phone) {
    return { ok: false, error: "Teléfono inválido o vacío" };
  }

  const ref = db.collection(COLLECTION).doc(phone);

  const newCustomer = {
    phone,
    name: input.name ?? null,
    usualClientType: input.usualClientType ?? "desconocido",
    lastClientType: input.lastClientType ?? "desconocido",
    recurrent: false,
    blocked: false,
    priorityScore: 0,
    favoriteCategories: [],
    lastCategory: null,
    lastCatalogSent: null,
    summary: "",
    lastInteractionAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  try {
    await ref.set(newCustomer);
    log("info", "customer.service", "Customer created", { phone });
    const snap = await ref.get();
    return { ok: true, data: fromFirestore(snap.id, snap.data()!) };
  } catch (error) {
    log("error", "customer.service", "Error creating customer", {
      phone,
      error: String(error),
    });
    return { ok: false, error: String(error) };
  }
}

export async function findOrCreateCustomer(
  rawPhone: string,
  name?: string | null
): Promise<ServiceResult<Customer>> {
  const existing = await findCustomerByPhone(rawPhone);
  if (existing) return { ok: true, data: existing };
  return createCustomer({ phone: rawPhone, name: name ?? null });
}

export async function updateCustomer(
  customerId: string,
  patch: Partial<
    Pick<
      Customer,
      | "name"
      | "usualClientType"
      | "lastClientType"
      | "recurrent"
      | "blocked"
      | "priorityScore"
      | "favoriteCategories"
      | "lastCategory"
      | "lastCatalogSent"
      | "summary"
    >
  >
): Promise<ServiceResult<void>> {
  try {
    const ref = db.collection(COLLECTION).doc(customerId);
    await ref.update({
      ...patch,
      lastInteractionAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, data: undefined };
  } catch (error) {
    log("error", "customer.service", "Error updating customer", {
      customerId,
      error: String(error),
    });
    return { ok: false, error: String(error) };
  }
}