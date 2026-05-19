// app/report/page.tsx

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-4xl">

      {/* Header */}
      <h1 className="mb-6 text-xl font-bold text-gray-900 sm:text-2xl">📊 Report</h1>

      {/* TODO: Time range toggle [ วันนี้ ] [ 7 วัน ] [ 30 วัน ] */}

      {/* TODO: Summary cards — Notes / Edits / Requests / Approved */}

      {/* TODO: Bar chart — Notes รายวัน (Recharts) */}

      {/* TODO: Donut chart — Request status (pending/approved/rejected) */}

      {/* TODO: Table — ร้านที่ note ล่าสุด */}

      {/* TODO: (Admin only) Grouped bar chart — เปรียบเทียบ sale */}

      <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 sm:h-64">
        <p className="text-sm text-gray-300">Report — coming soon</p>
      </div>

    </div>
  )
}
