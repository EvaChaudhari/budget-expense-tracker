# Normalization Report: `ledgr` Database

**Course**: Database Systems (DBS)  
**Project**: Personal Finance Tracker (`ledgr`)  
**Target RDBMS**: MySQL 8.4  

---

## 1. Executive Summary

This report presents a formal normalization analysis of the 7 relational tables in the `ledgr` database. We evaluate the schema across **First Normal Form (1NF)**, **Second Normal Form (2NF)**, **Third Normal Form (3NF)**, and **Boyce-Codd Normal Form (BCNF)** using the theory of **Functional Dependencies (FDs)**. 

Additionally, this report examines two key database design decisions:
1. **The atomicity of expense tagging** when using existing free-text fields (`note`, `description`) versus a normalized Many-to-Many ($N:M$) design.
2. **Controlled denormalization** in `accounts.balance` (stored derived attribute) versus live aggregation.

---

## 2. Functional Dependency (FD) Analysis

Let $R(A_1, A_2, \dots, A_n)$ denote a relation schema. A functional dependency $X \rightarrow Y$ holds over $R$ if and only if any two tuples agreeing on attribute set $X$ must also agree on attribute set $Y$.

Below is the minimal cover of functional dependencies identified for each table based on the application's domain rules:

### 2.1. `settings`
* **Attributes**: `(id, week_start, currency_country, currency_code, currency_symbol, unit_position, created_at, updated_at)`
* **Candidate Key**: `{id}`
* **Primary Key**: `id`
* **Functional Dependencies**:
  $$FD_1: \{id\} \rightarrow \{week\_start, currency\_country, currency\_code, currency\_symbol, unit\_position, created\_at, updated\_at\}$$

### 2.2. `account_groups`
* **Attributes**: `(id, name, sort_order)`
* **Candidate Key**: `{id}`
* **Primary Key**: `id`
* **Functional Dependencies**:
  $$FD_1: \{id\} \rightarrow \{name, sort\_order\}$$

### 2.3. `accounts`
* **Attributes**: `(id, name, type, icon, color, balance, group_id, created_at, updated_at)`
* **Candidate Key**: `{id}`
* **Primary Key**: `id`
* **Functional Dependencies**:
  $$FD_1: \{id\} \rightarrow \{name, type, icon, color, balance, group\_id, created\_at, updated\_at\}$$
* *(Note: `group_id` is a foreign key referencing `account_groups(id)`. Group attributes such as `group_name` are not stored in `accounts`, avoiding transitive dependencies).*

### 2.4. `categories`
* **Attributes**: `(id, name, type, icon)`
* **Candidate Keys**:
  1. $K_1 = \{id\}$ (Surrogate Primary Key)
  2. $K_2 = \{name, type\}$ (Enforced via `uq_name_type`)
* **Primary Key**: `id`
* **Functional Dependencies**:
  $$FD_1: \{id\} \rightarrow \{name, type, icon\}$$
  $$FD_2: \{name, type\} \rightarrow \{id, icon\}$$

### 2.5. `budget_defaults`
* **Attributes**: `(id, category_id, start_year, start_month, amount, created_at)`
* **Candidate Keys**:
  1. $K_1 = \{id\}$ (Surrogate Primary Key)
  2. $K_2 = \{category\_id, start\_year, start\_month\}$ (Enforced via `uq_cat_start`)
* **Primary Key**: `id`
* **Functional Dependencies**:
  $$FD_1: \{id\} \rightarrow \{category\_id, start\_year, start\_month, amount, created\_at\}$$
  $$FD_2: \{category\_id, start\_year, start\_month\} \rightarrow \{id, amount, created\_at\}$$

### 2.6. `budget_overrides`
* **Attributes**: `(id, category_id, year, month, amount, created_at, updated_at)`
* **Candidate Keys**:
  1. $K_1 = \{id\}$ (Surrogate Primary Key)
  2. $K_2 = \{category\_id, year, month\}$ (Enforced via `uq_cat_ym`)
* **Primary Key**: `id`
* **Functional Dependencies**:
  $$FD_1: \{id\} \rightarrow \{category\_id, year, month, amount, created\_at, updated\_at\}$$
  $$FD_2: \{category\_id, year, month\} \rightarrow \{id, amount, created\_at, updated\_at\}$$

### 2.7. `transactions`
* **Attributes**: `(id, account_id, category_id, amount, note, description, tx_date, tx_time, created_at, updated_at)`
* **Candidate Key**: `{id}`
* **Primary Key**: `id`
* **Functional Dependencies**:
  $$FD_1: \{id\} \rightarrow \{account\_id, category\_id, amount, note, description, tx\_date, tx\_time, created\_at, updated\_at\}$$

---

## 3. Step-by-Step Normalization Evaluation

### 3.1. First Normal Form (1NF)

**Definition**: A relation $R$ is in 1NF if and only if:
1. Every attribute domain contains only atomic (indivisible) values.
2. There are no repeating groups or arrays stored in any attribute.
3. A unique primary key is defined for the relation.

#### Verification:
* Every table (`settings`, `account_groups`, `accounts`, `categories`, `budget_defaults`, `budget_overrides`, `transactions`) defines a single surrogate integer `id` as `PRIMARY KEY AUTO_INCREMENT`.
* All numeric fields (`balance`, `amount`, `sort_order`, `year`, `month`) and temporal fields (`tx_date`, `tx_time`, `created_at`, `updated_at`) contain single scalar values.
* There are no repeating attribute groups (e.g., `month_1_budget`, `month_2_budget`); temporal budgets are normalized across rows in `budget_defaults` and `budget_overrides`.

#### 1NF Academic Evaluation of Expense Tagging:
* If users store multiple tags in `note` (e.g., `'#food #lunch #work'`) or in `description` (e.g., `'["food", "lunch", "work"]'`):
  * **Relational Theory Verdict**: Storing multivalued lists in a single string column is a technical departure from 1NF atomicity.
  * **Practical Trade-off**: It requires zero schema migrations and supports backward compatibility, but prevents relational DBMS guarantees (referential integrity, foreign key cascading, and indexable B-Tree seeks).

**Status**: **SATISFIED (1NF)**.

---

### 3.2. Second Normal Form (2NF)

**Definition**: A relation $R$ is in 2NF if and only if:
1. It is in 1NF.
2. No non-prime attribute is partially dependent on any candidate key of $R$. (A non-prime attribute is an attribute that does not belong to any candidate key).

#### Verification:
* **Tables with Single-Attribute Candidate Keys**:
  * For `settings`, `account_groups`, `accounts`, and `transactions`, the only candidate key is `{id}` (a single attribute). Because a single attribute cannot have a proper subset, **partial dependency is mathematically impossible**. These tables are trivially in 2NF.
* **Tables with Composite Candidate Keys**:
  * **`categories`**:
    * Candidate Keys: $\{id\}$, $\{name, type\}$.
    * Prime attributes: `id`, `name`, `type`.
    * Non-prime attributes: `icon`.
    * Dependency: $\{name, type\} \rightarrow icon$. Neither $name \rightarrow icon$ nor $type \rightarrow icon$ holds independently because category names can repeat across types (e.g., an 'Investment' expense vs. an 'Investment' income can have different icons). The non-prime attribute `icon` is fully functionally dependent on the entire composite key.
  * **`budget_defaults`**:
    * Candidate Keys: $\{id\}$, $\{category\_id, start\_year, start\_month\}$.
    * Prime attributes: `id`, `category_id`, `start_year`, `start_month`.
    * Non-prime attributes: `amount`, `created_at`.
    * Dependency: $\{category\_id, start\_year, start\_month\} \rightarrow \{amount, created\_at\}$. The budget amount cannot be determined by `category_id` alone (budgets change across years) nor by `(start_year, start_month)` alone. Thus, full functional dependency holds.
  * **`budget_overrides`**:
    * Candidate Keys: $\{id\}$, $\{category\_id, year, month\}$.
    * Prime attributes: `id`, `category_id`, `year`, `month`.
    * Non-prime attributes: `amount`, `created_at`, `updated_at`.
    * Dependency: $\{category\_id, year, month\} \rightarrow \{amount, created\_at, updated\_at\}$. The override amount depends on the complete triple of category, year, and month. Full functional dependency holds.

**Status**: **SATISFIED (2NF)**.

---

### 3.3. Third Normal Form (3NF)

**Definition**: A relation $R$ is in 3NF if and only if:
1. It is in 2NF.
2. For every non-trivial functional dependency $X \rightarrow Y$:
   * $X$ is a superkey of $R$, OR
   * $Y$ is a prime attribute of $R$ (i.e., each attribute in $Y$ is part of some candidate key).

In other words, no non-prime attribute is transitively dependent on a candidate key ($K \rightarrow X \rightarrow Y$ where $Y$ is non-prime and $X$ is not a superkey).

#### Verification:
* **`settings`**: Only dependency is $\{id\} \rightarrow \text{all attributes}$. $\{id\}$ is a superkey. No transitive dependencies.
* **`account_groups`**: Only dependency is $\{id\} \rightarrow \{name, sort\_order\}$. $\{id\}$ is a superkey.
* **`accounts`**:
  * Primary dependency: $\{id\} \rightarrow \{name, type, icon, color, balance, group\_id, \dots\}$.
  * Check for transitive dependency via `group_id`: `group_id` determines group name, but `accounts` does *not* store group name. The relation stores only the foreign key `group_id`. To resolve the group name, the application performs a relational `JOIN` with `account_groups`. Hence, no transitive dependency exists in `accounts`.
* **`categories`**:
  * $FD_1: \{id\} \rightarrow \{name, type, icon\}$ ($\{id\}$ is a superkey).
  * $FD_2: \{name, type\} \rightarrow \{id, icon\}$ ($\{name, type\}$ is a superkey).
  * Both determinants are superkeys.
* **`budget_defaults`**:
  * Determinants are $\{id\}$ and $\{category\_id, start\_year, start\_month\}$. Both are superkeys.
* **`budget_overrides`**:
  * Determinants are $\{id\}$ and $\{category\_id, year, month\}$. Both are superkeys.
* **`transactions`**:
  * Dependency: $\{id\} \rightarrow \{account\_id, category\_id, amount, note, description, tx\_date, tx\_time, \dots\}$.
  * `account_id` and `category_id` are foreign keys. Neither account names, account balances, category names, nor category types are duplicated inside `transactions`. All descriptive attributes are isolated in their respective parent tables.

**Status**: **SATISFIED (3NF)**.

---

### 3.4. Boyce-Codd Normal Form (BCNF)

**Definition**: A relation $R$ is in BCNF if and only if for every non-trivial functional dependency $X \rightarrow Y$, $X$ is a **superkey**.

* In all 7 tables, every determinant appearing in the minimal cover of functional dependencies ($\{id\}$, $\{name, type\}$, $\{category\_id, start\_year, start\_month\}$, $\{category\_id, year, month\}$) is a candidate key, and therefore a superkey.
* Because every determinant is a superkey, no table violates BCNF.

**Status**: **SATISFIED (BCNF)**.

---

## 4. Controlled Denormalization Analysis: `accounts.balance`

An important topic in database systems evaluation is **controlled denormalization**—intentionally preserving a derived value to optimize system performance.

### 4.1. The Theoretical Anomaly
In pure relational theory, an attribute whose value can be computed deterministically from other stored records should not be stored as a persistent column.
$$\text{Account Balance} = \sum_{t \in \text{transactions}} t.amount \quad \text{where } t.account\_id = accounts.id$$

Storing `balance` in `accounts` creates a redundant derived attribute. If an update anomaly occurs (e.g., an insert into `transactions` succeeds but the `accounts` update fails), the ledger becomes inconsistent.

### 4.2. Practical Engineering Justification
In financial software engineering, storing the running balance is standard practice for three critical reasons:

1. **Query Complexity & Read Latency ($O(1)$ vs $O(N)$)**:
   * Fetching the user's dashboard balance in `ledgr` requires a simple:
     ```sql
     SELECT id, name, balance FROM accounts;
     ```
   * Without this column, displaying the accounts screen would require aggregating every historical transaction across all time:
     ```sql
     SELECT a.id, a.name, COALESCE(SUM(t.amount), 0) AS balance
     FROM accounts a
     LEFT JOIN transactions t ON a.id = t.account_id
     GROUP BY a.id, a.name;
     ```
   * As the `transactions` table grows to hundreds of thousands of rows, the aggregation query causes significant disk I/O and query latency.
2. **Transaction Isolation & Concurrency Control**:
   * The application synchronizes balance modifications within database operations (as seen in [`server/src/controllers/transactions.controller.ts`](file:///Users/evariteshkumarchaudhari/Desktop/projects/budget-tracker/server/src/controllers/transactions.controller.ts)):
     ```sql
     UPDATE accounts SET balance = balance + ? WHERE id = ?;
     ```
   * In a high-concurrency production setting, this balance column allows pessimistic locking (`SELECT ... FOR UPDATE`) to prevent race conditions during overdraft checks.

---

## 5. Architectural Comparison: Expense Tagging

To address Requirement #10, the table below compares the current schema approach with an idealized 3NF/BCNF Many-to-Many design:

| Design Dimension | Existing Schema Approach (`note` / `description`) | Idealized Normalized Design (`tags` & `transaction_tags`) |
| :--- | :--- | :--- |
| **Schema Changes Required** | **Zero** (retains existing columns) | Requires 2 new tables (`tags`, `transaction_tags`) |
| **Normal Form Compliance** | **1NF Violation** (multivalued list stored in single string) | **Strict 3NF / BCNF Compliant** |
| **Referential Integrity** | None (typos such as `#groceries` vs `#grocerie` allowed) | Full foreign key constraint (`FOREIGN KEY (tag_id) REFERENCES tags(id)`) |
| **Tag Deletion / Renaming** | Requires table-wide text replacements (`REPLACE()`) | Single-row update in `tags` table; cascades automatically |
| **Search Performance** | $O(N)$ Full table scan with `LIKE '%#tag%'` | $O(\log N)$ B-Tree index seek on junction table |
| **Aggregation Capabilities** | Complex string parsing / `JSON_TABLE()` required | Standard `JOIN` and `GROUP BY tag_name` |

### Idealized Schema for Reference (Academic Modeling Only):
```sql
-- Conceptual 3NF design (not implemented, preserving existing schema)
CREATE TABLE tags (
    id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE transaction_tags (
    transaction_id INT UNSIGNED NOT NULL,
    tag_id         INT UNSIGNED NOT NULL,
    PRIMARY KEY (transaction_id, tag_id),
    CONSTRAINT fk_tt_tx  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_tt_tag FOREIGN KEY (tag_id)         REFERENCES tags(id)         ON DELETE CASCADE
);
```

---

## 6. Conclusion

The `ledgr` database is in **Third Normal Form (3NF)** and **Boyce-Codd Normal Form (BCNF)**. 
* All relations satisfy atomic domain constraints.
* Surrogate primary keys eliminate partial functional dependencies.
* Foreign keys prevent transitive functional dependencies.
* The presence of `accounts.balance` represents a deliberate, controlled denormalization for read efficiency, maintained consistently via application-level updates.
