import { Router, type IRouter } from "express";
import healthRouter from "./health";
import oauthRouter from "./oauth";
import developerAppsRouter from "./developerApps";
import docsRouter from "./docs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(oauthRouter);
router.use(developerAppsRouter);
router.use(docsRouter);

export default router;
