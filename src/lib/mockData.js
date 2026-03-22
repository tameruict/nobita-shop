export const mockRevenueData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 2000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 1890 },
  { name: 'Sat', revenue: 2390 },
  { name: 'Sun', revenue: 3490 },
];

export const mockUsersData = [
  { id: '1', email: 'john@example.com', full_name: 'John Doe', role: 'user', status: 'active', created_at: '2024-05-12T10:00:00Z' },
  { id: '2', email: 'jane@nobita.ai', full_name: 'Jane Smith', role: 'admin', status: 'active', created_at: '2024-05-14T11:30:00Z' },
  { id: '3', email: 'bob@test.com', full_name: 'Bob Johnson', role: 'user', status: 'inactive', created_at: '2024-06-01T09:15:00Z' },
  { id: '4', email: 'alice@wonderland.com', full_name: 'Alice Liddell', role: 'user', status: 'deleted', created_at: '2024-06-10T14:45:00Z' },
  { id: '5', email: 'charlie@chaplin.com', full_name: 'Charlie Chaplin', role: 'user', status: 'active', created_at: '2024-06-15T08:20:00Z' },
];

export const mockTransactions = [
  { id: 'tx-101', user: 'John Doe', product: 'Economy Pack', amount: 15, date: '2024-06-18' },
  { id: 'tx-102', user: 'Alice Liddell', product: 'Premium', amount: 45, date: '2024-06-18' },
  { id: 'tx-103', user: 'Charlie Chaplin', product: 'Individual', amount: 5, date: '2024-06-17' }
];
