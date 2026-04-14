import type { Voter } from "../models/voter.model";

function csvEscape(value: unknown) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

const CSV_HEADER = [
    "epic_number",
    "first_name_english",
    "first_name_local",
    "last_name_english",
    "last_name_local",
    "gender",
    "age",
    "relative_first_name_english",
    "relative_first_name_local",
    "relative_last_name_english",
    "relative_last_name_local",
    "state",
    "parliamentary_constituency",
    "assembly_constituency",
    "polling_station",
    "part_number_name",
    "part_serial_number",
];

export function buildVotersCsv(rows: Voter[]): string {
    const csvLines: string[] = [];
    csvLines.push(CSV_HEADER.map(csvEscape).join(","));

    for (const voter of rows) {
        csvLines.push(
            [
                voter.epic_number,
                voter.first_name_english,
                voter.first_name_local,
                voter.last_name_english,
                voter.last_name_local,
                voter.gender,
                voter.age,
                voter.relative_first_name_english,
                voter.relative_first_name_local,
                voter.relative_last_name_english,
                voter.relative_last_name_local,
                voter.state,
                voter.parliamentary_constituency,
                voter.assembly_constituency,
                voter.polling_station,
                voter.part_number_name,
                voter.part_serial_number,
            ]
                .map(csvEscape)
                .join(",")
        );
    }

    return csvLines.join("\n");
}
