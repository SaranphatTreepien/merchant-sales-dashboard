// app/report/page.tsx

export default function ReportPage() {
  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">📊 Report</h1>

      {/* TODO: Time range toggle [ วันนี้ ] [ 7 วัน ] [ 30 วัน ] */}

      {/* TODO: Summary cards — Notes / Edits / Requests / Approved */}

      {/* TODO: Bar chart — Notes รายวัน (Recharts) */}

      {/* TODO: Donut chart — Request status (pending/approved/rejected) */}

      {/* TODO: Table — ร้านที่ note ล่าสุด */}

      {/* TODO: (Admin only) Grouped bar chart — เปรียบเทียบ sale */}

      <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl">
        <p className="text-sm text-gray-300">Report — coming soon</p>
      </div>

    </div>
  )
}