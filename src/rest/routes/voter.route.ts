import { Router, type Request } from "express";
import { voterRepository } from "../../repositories/voter.repository";
import { requireAuthMiddleware } from "../../middleware/auth.middleware";
import { buildVotersCsv } from "../../utils/voter-csv";

const voterRoutes = Router();

const readQueryString = (req: Request, key: string): string | null => {
    const rawValue = req.query[key];
    if (Array.isArray(rawValue)) {
        return typeof rawValue[0] === "string" ? rawValue[0] : null;
    }
    return typeof rawValue === "string" ? rawValue : null;
};

const slugify = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

voterRoutes.get("/export", requireAuthMiddleware, async (req, res) => {
    const assemblyConstituency = readQueryString(req, "assembly_constituency");
    const parliamentaryConstituency = readQueryString(
        req,
        "parliamentary_constituency"
    );
    const partNumberName = readQueryString(req, "part_number_name");

    if (!assemblyConstituency || assemblyConstituency === "ALL") {
        res.status(400).json({
            success: false,
            message: "assembly_constituency is required",
        });
        return;
    }

    const result = await voterRepository.getForExport(
        assemblyConstituency,
        parliamentaryConstituency,
        partNumberName
    );

    if (result.isErr()) {
        res.status(500).json({
            success: false,
            message: "Failed to export voters CSV",
        });
        return;
    }

    const csvContent = buildVotersCsv(result.value);
    const fileName = `voters_${slugify(assemblyConstituency)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
    );
    res.status(200).send(csvContent);
});

export default voterRoutes;
