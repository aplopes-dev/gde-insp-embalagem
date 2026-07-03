import { PackagingJerpDto } from "@/types/dtos/op-jerp-dto";

export type BlisterConfig = {
  slots: number;
  limitPerBox: number;
};

export type PieceRegistrationSource = "local_db" | "jerp_op" | "history";

export type PieceRegistrationResolution =
  | {
      mode: "auto";
      slots: number;
      limitPerBox: number;
      blisterPackagingId: number;
      source: PieceRegistrationSource;
    }
  | {
      mode: "supervisor";
      reason: string;
      partialData?: Partial<BlisterConfig>;
    };

export type ResolvePieceRegistrationInput = {
  blisterPackaging?: PackagingJerpDto;
  existingBlisterType?: {
    id: number;
    slots: number;
    limitPerBox: number;
  } | null;
  historyBlisterConfig?: BlisterConfig | null;
};

export function isValidBlisterConfig(
  slots?: number,
  limitPerBox?: number
): slots is number {
  return (
    slots != null &&
    limitPerBox != null &&
    slots > 0 &&
    limitPerBox > 0
  );
}

export function resolvePieceRegistration(
  input: ResolvePieceRegistrationInput
): PieceRegistrationResolution {
  const { blisterPackaging, existingBlisterType, historyBlisterConfig } = input;

  if (!blisterPackaging) {
    return {
      mode: "supervisor",
      reason: "Não foi possível identificar o blister principal da OP.",
    };
  }

  if (
    existingBlisterType &&
    isValidBlisterConfig(existingBlisterType.slots, existingBlisterType.limitPerBox)
  ) {
    return {
      mode: "auto",
      slots: existingBlisterType.slots,
      limitPerBox: existingBlisterType.limitPerBox,
      blisterPackagingId: blisterPackaging.id,
      source: "local_db",
    };
  }

  if (
    isValidBlisterConfig(blisterPackaging.slots, blisterPackaging.limitePorCaixa)
  ) {
    return {
      mode: "auto",
      slots: blisterPackaging.slots,
      limitPerBox: blisterPackaging.limitePorCaixa,
      blisterPackagingId: blisterPackaging.id,
      source: "jerp_op",
    };
  }

  if (
    historyBlisterConfig &&
    isValidBlisterConfig(
      historyBlisterConfig.slots,
      historyBlisterConfig.limitPerBox
    )
  ) {
    return {
      mode: "auto",
      slots: historyBlisterConfig.slots,
      limitPerBox: historyBlisterConfig.limitPerBox,
      blisterPackagingId: blisterPackaging.id,
      source: "history",
    };
  }

  const partialData: Partial<BlisterConfig> = {};
  const missingFields: string[] = [];

  if (!blisterPackaging.slots || blisterPackaging.slots <= 0) {
    missingFields.push("peças por blister");
  } else {
    partialData.slots = blisterPackaging.slots;
  }

  if (!blisterPackaging.limitePorCaixa || blisterPackaging.limitePorCaixa <= 0) {
    missingFields.push("blisters por caixa");
  } else {
    partialData.limitPerBox = blisterPackaging.limitePorCaixa;
  }

  const reason =
    missingFields.length === 2
      ? "O JERP não informou peças por blister e blisters por caixa."
      : `O JERP não informou ${missingFields.join(" e ")}.`;

  return {
    mode: "supervisor",
    reason,
    partialData: Object.keys(partialData).length > 0 ? partialData : undefined,
  };
}
