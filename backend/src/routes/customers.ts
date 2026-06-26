import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listCustomers, getCustomer } from "../controllers/customers";

export const customersRouter = Router();

// Visible to any authenticated user, same as tickets — customer history is
// just a different view of ticket data everyone can already see.
customersRouter.use(requireAuth);
customersRouter.get("/", listCustomers);
customersRouter.get("/:id", getCustomer);
