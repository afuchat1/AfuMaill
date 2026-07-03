import { Router, type IRouter } from "express";
import healthRouter from "./health";
import oauthRouter from "./oauth";
import docsRouter from "./docs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(oauthRouter);
router.use(docsRouter);

export default router;
