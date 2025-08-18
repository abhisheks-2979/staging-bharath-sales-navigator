import React from 'react';
import { StockCycleTable } from '@/components/StockCycleTable';
import { Layout } from '@/components/Layout';

const StockCycle = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Cycle Management</h1>
          <p className="text-muted-foreground">
            Track product stock levels and ordering patterns across retailer visits
          </p>
        </div>
        
        <StockCycleTable />
      </div>
    </Layout>
  );
};

export default StockCycle;