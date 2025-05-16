import { formatPrice } from "./formatPrice";

/**
 * Tính toán giá trị còn lại dựa trên giá gốc và tỷ lệ khấu hao
 * @param originPrice - Giá gốc
 * @param depreciationRate - Tỷ lệ khấu hao (%)
 * @returns Object chứa giá trị và chuỗi đã định dạng
 */
export const calculateRemainingValue = (originPrice: number, depreciationRate: number) => {
  const remainingValue = originPrice * (1 - depreciationRate / 100);
  return {
    value: remainingValue,
    formatted: formatPrice(remainingValue)
  };
};

/**
 * Tính toán chênh lệch số lượng
 * @param quantity - Số lượng theo sổ sách
 * @param realCount - Số lượng thực tế
 * @returns Object chứa số lượng thừa và thiếu
 */
export const calculateQuantityDifference = (quantity: number, realCount: number) => {
  let surplusQuantity = 0;
  let missingQuantity = 0;

  if (realCount > quantity) {
    surplusQuantity = realCount - quantity;
  } else if (quantity > realCount) {
    missingQuantity = quantity - realCount;
  }

  return {
    surplusQuantity,
    missingQuantity
  };
};

/**
 * Hàm định dạng giá tiền cho tài sản
 * @param unitPrice - Đơn giá
 * @param quantity - Số lượng
 * @returns Object chứa giá gốc và chuỗi đã định dạng
 */
export const calculateOriginPrice = (unitPrice: number, quantity: number) => {
  const originPrice = unitPrice * quantity;
  return {
    value: originPrice,
    formatted: formatPrice(originPrice)
  };
};
