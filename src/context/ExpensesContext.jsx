import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as expensesApi from "../api/expenses.js";

const ExpensesContext = createContext(null);

export function ExpensesProvider({ children }) {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const data = await expensesApi.getExpenses();
    setExpenses(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addExpense = useCallback(
    async (payload) => {
      await expensesApi.addExpense(payload);
      await refresh();
    },
    [refresh]
  );

  const updateExpense = useCallback(
    async (id, updates) => {
      await expensesApi.updateExpense(id, updates);
      await refresh();
    },
    [refresh]
  );

  const deleteExpense = useCallback(
    async (id) => {
      await expensesApi.deleteExpense(id);
      await refresh();
    },
    [refresh]
  );

  const downloadBackup = useCallback(async () => {
    const backup = await expensesApi.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oybek-system-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const value = {
    expenses,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    downloadBackup,
  };

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) {
    throw new Error("useExpenses ExpensesProvider ichida ishlatilishi kerak");
  }
  return ctx;
}
