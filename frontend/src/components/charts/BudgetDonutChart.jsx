import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function BudgetDonutChart({ budgets }) {
  if (!budgets?.length) {
    return (
      <div style={styles.empty} data-testid="budget-donut-empty">
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No budgets set this month</p>
      </div>
    );
  }

  const data = budgets.map(b => ({
    name:  b.category?.name || 'Unknown',
    value: b.spent || 0,
    limit: b.limitAmount,
    color: b.category?.color || '#6b7280',
  })).filter(d => d.value > 0);

  if (!data.length) {
    return (
      <div style={styles.empty} data-testid="budget-donut-empty">
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No spending recorded yet</p>
      </div>
    );
  }

  return (
    <div style={styles.wrap} data-testid="budget-donut-chart">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, name) => [`$${v.toFixed(2)}`, name]}
            contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.375rem' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '0.78rem' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  wrap:  { width: '100%' },
  empty: { height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', borderRadius: '0.375rem', border: '1px dashed var(--color-border)' },
};
