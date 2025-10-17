export async function POST() {
  // O logout efetivo deve ser feito no cliente via next-auth/react -> signOut().
  return Response.json({ ok: true });
}

