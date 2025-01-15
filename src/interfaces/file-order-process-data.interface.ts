import { EOrderProcessingStatus } from "../constants";

export interface IFileOrdersProcessData {
  totalOrders: number;
  duplicateOrdersCount: number;
  validationFailedOrdersCount: number;
  successfullyProcessedCount: number;
  status: EOrderProcessingStatus;
}
