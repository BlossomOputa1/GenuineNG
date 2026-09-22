export const manufacturerProfile = {
  companyName: "Emzor Pharmaceuticals",
  status: "Approved manufacturer",
  initials: "EP",
};

export const manufacturerProducts = [
  {
    id: "prod-paracetamol",
    name: "Paracetamol 500mg",
    category: "Drug",
    nafdacNumber: "A4-1234",
    batchCount: 8,
    codesIssued: 124500,
    scanCount: 18420,
  },
  {
    id: "prod-vitc",
    name: "Vitamin C 1000mg",
    category: "Supplement",
    nafdacNumber: "B1-4820",
    batchCount: 5,
    codesIssued: 78000,
    scanCount: 9328,
  },
  {
    id: "prod-cough",
    name: "Cough Relief Syrup",
    category: "Drug",
    nafdacNumber: "A7-9831",
    batchCount: 3,
    codesIssued: 36000,
    scanCount: 4107,
  },
];

export const manufacturerBatches = [
  {
    id: "batch-emz-260921-a",
    productId: "prod-paracetamol",
    productName: "Paracetamol 500mg",
    batchCode: "EMZ-260921-A",
    manufacturedDate: "21 Sep 2026",
    expiryDate: "21 Sep 2029",
    unitsProduced: 50000,
    codesGenerated: 50000,
    status: "generated",
  },
  {
    id: "batch-vc-2608-b",
    productId: "prod-vitc",
    productName: "Vitamin C 1000mg",
    batchCode: "VC-2608-B",
    manufacturedDate: "30 Aug 2026",
    expiryDate: "30 Aug 2028",
    unitsProduced: 20000,
    codesGenerated: 0,
    status: "ready",
  },
  {
    id: "batch-crs-2607-c",
    productId: "prod-cough",
    productName: "Cough Relief Syrup",
    batchCode: "CRS-2607-C",
    manufacturedDate: "14 Jul 2026",
    expiryDate: "14 Jul 2028",
    unitsProduced: 12000,
    codesGenerated: 12000,
    status: "generated",
  },
];

export const manufacturerScanActivity = [
  {
    id: "activity-paracetamol",
    productName: "Paracetamol 500mg",
    batchCode: "EMZ-260921-A",
    scans: 8419,
    reuseSignals: 0,
    trend: "+18%",
  },
  {
    id: "activity-vitc",
    productName: "Vitamin C 1000mg",
    batchCode: "VC-2607-A",
    scans: 2301,
    reuseSignals: 14,
    trend: "+9%",
  },
  {
    id: "activity-cough",
    productName: "Cough Relief Syrup",
    batchCode: "CRS-2607-C",
    scans: 1148,
    reuseSignals: 2,
    trend: "+4%",
  },
];
