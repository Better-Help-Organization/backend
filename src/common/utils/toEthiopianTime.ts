export function toEthiopianTime(date: Date | string): string {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
        console.error("Invalid date passed:", date);
        return "";
    }

    const options = {
        timeZone: "Africa/Addis_Ababa",
        hour: "numeric",
        minute: "numeric",
        hour12: false
    } as const;

    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(d);

    let hour = Number(parts.find(p => p.type === "hour")?.value ?? 0);
    const minute = parts.find(p => p.type === "minute")?.value ?? "00";

    hour = hour - 6;
    if (hour <= 0) hour += 12;
    if (hour > 12) hour -= 12;

    return `${hour}:${minute}`;
}
