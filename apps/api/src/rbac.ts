export type Role = "owner" | "admin" | "builder" | "operator" | "viewer";

const order: Role[] = ["viewer", "operator", "builder", "admin", "owner"];

export function hasAtLeast(role: Role, required: Role) {
  return order.indexOf(role) >= order.indexOf(required);
}
