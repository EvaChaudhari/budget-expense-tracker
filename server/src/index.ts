import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import settingsRouter from './routes/settings.route.js';
import categoriesRouter from './routes/categories.route.js';
import accountsRouter from './routes/accounts.route.js';
import transactionsRouter from './routes/transactions.route.js';
import statsRouter from './routes/stats.route.js';
import budgetsRouter from './routes/budgets.route.js';
import accountGroupsRouter from './routes/account_groups.route.js';
import paymentMethodsRouter from './routes/payment_methods.route.js';
import recurringRouter from './routes/recurring.route.js';
import familyMembersRouter from './routes/family_members.route.js';
import childBudgetsRouter from './routes/child_budgets.route.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Support both prefixed (/api/*) and root routes for client Vite proxy and direct API access
app.use('/settings', settingsRouter);
app.use('/api/settings', settingsRouter);

app.use('/categories', categoriesRouter);
app.use('/api/categories', categoriesRouter);

app.use('/accounts', accountsRouter);
app.use('/api/accounts', accountsRouter);

app.use('/account-groups', accountGroupsRouter);
app.use('/api/account-groups', accountGroupsRouter);

app.use('/transactions', transactionsRouter);
app.use('/api/transactions', transactionsRouter);

app.use('/stats', statsRouter);
app.use('/api/stats', statsRouter);

app.use('/budgets', budgetsRouter);
app.use('/api/budgets', budgetsRouter);

app.use('/payment-methods', paymentMethodsRouter);
app.use('/api/payment-methods', paymentMethodsRouter);

app.use('/recurring', recurringRouter);
app.use('/api/recurring', recurringRouter);

app.use('/family-members', familyMembersRouter);
app.use('/api/family-members', familyMembersRouter);

app.use('/child-budgets', childBudgetsRouter);
app.use('/api/child-budgets', childBudgetsRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test' && !process.argv.includes('--test') && !process.execArgv.includes('--test')) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
