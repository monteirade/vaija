"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { approveDriverApplicationAction, type ApproveState } from "@/lib/drivers/actions";

const initialState: ApproveState = {};

export function ApproveApplicationButton({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState(approveDriverApplicationAction, initialState);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="applicationId" value={applicationId} />
        <Button size="sm" type="submit" disabled={pending || Boolean(state.message)}>
          {pending ? "A aprovar..." : state.message ? "Aprovada ✓" : "Aprovar"}
        </Button>
      </form>
      {state.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
      {state.temporaryPassword && (
        <p className="mt-1 text-xs text-muted-foreground">
          Password temporária (partilhar com o motorista): <span className="font-mono text-brand-yellow">{state.temporaryPassword}</span>
        </p>
      )}
    </div>
  );
}
