/**
 * Định dạng số thành chuỗi giá tiền với dấu phẩy ngăn cách hàng nghìn
 * @param value - Giá trị cần định dạng
 * @param currency - Đơn vị tiền tệ (mặc định: '', trống)
 * @param showZero - Có hiển thị giá trị 0 không (mặc định: true)
 * @param decimals - Số chữ số thập phân cần giữ lại (mặc định: 0)
 * @returns Chuỗi giá tiền đã định dạng
 */
export function formatPrice(
  value: number, 
  currency: string = '', 
  showZero: boolean = true,
  decimals: number = 0
): string {
  // Xử lý trường hợp giá trị là 0
  if (value === 0 && !showZero) {
    return '-';
  }
  
  // Xử lý số âm
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  // Làm tròn đến số chữ số thập phân được chỉ định
  const roundedValue = decimals > 0 
    ? absValue.toFixed(decimals) 
    : Math.round(absValue).toString();
  
  // Tách phần nguyên và phần thập phân
  const [integerPart, decimalPart] = roundedValue.split('.');
  
  // Định dạng phần nguyên với dấu phẩy ngăn cách hàng nghìn
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  // Kết hợp phần nguyên và phần thập phân (nếu có)
  const formattedValue = decimalPart 
    ? `${formattedInteger}.${decimalPart}` 
    : formattedInteger;
  
  // Kết hợp với dấu âm (nếu có) và đơn vị tiền tệ (nếu có)
  const result = `${isNegative ? '-' : ''}${formattedValue}`;
  
  // Thêm đơn vị tiền tệ nếu được cung cấp
  return currency ? `${result} ${currency}` : result;
}

/**
 * Chuyển đổi chuỗi giá tiền đã định dạng thành số
 * @param value - Chuỗi giá tiền đã định dạng
 * @returns Giá trị số
 */
export function convertToNumber(value: string): number {
  // Loại bỏ tất cả ký tự không phải số, dấu chấm và dấu trừ
  const strValue = value.replace(/[^\d.-]/g, "");
  return Number(strValue);
}