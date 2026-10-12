import { invoiceDetailsUrl } from './factures-service';

describe('invoiceDetailsUrl', () => {
  it('garde la référence entière, sans double barre oblique', () => {
    expect(invoiceDetailsUrl('https://api.rohafya.com/', 'FAC-CLB-5002')).toBe('https://api.rohafya.com/patient/factures/products/FAC-CLB-5002');
    expect(invoiceDetailsUrl('https://api.rohafya.com', ' FAC/2026/0105 ')).toBe('https://api.rohafya.com/patient/factures/products/FAC/2026/0105');
    expect(invoiceDetailsUrl('https://api.rohafya.com/', 'FAC 12#3')).toBe('https://api.rohafya.com/patient/factures/products/FAC%2012%233');
  });
});
