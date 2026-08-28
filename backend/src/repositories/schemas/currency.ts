import { z } from "zod";

export const currencySchema = z.string().length(3).uppercase();
