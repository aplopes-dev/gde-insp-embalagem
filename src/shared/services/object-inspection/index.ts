import { ObjectTypes } from "@/types/object-types";
import { ObjectValidation } from "@/types/validation";

export enum InspectionEnum {
  OBJECT_INVALID,
  TYPE_INVALID,
  QUANTITY_INVALID,
  VALID
}

export function objectInspection(
  expectedType: ObjectTypes,
  expectedId: string,
  objValidation: ObjectValidation,
  expectedCount: number,
): InspectionEnum {
  if (objValidation.type !== expectedType)
    return InspectionEnum.OBJECT_INVALID
  if (objValidation.itemId !== expectedId)
    return InspectionEnum.TYPE_INVALID
  if (objValidation.count !== expectedCount)
    return InspectionEnum.QUANTITY_INVALID
  return InspectionEnum.VALID
}