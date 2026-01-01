import jsonata from "jsonata";

export async function transformJsonata({ node, input }: any) {
  const expr = node.config?.expression;
  if (!expr) throw new Error("Missing JSONata expression");
  const res = await jsonata(expr).evaluate(input);
  return res;
}
