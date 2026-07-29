
export interface InstallationReportProps {
  title: string;
  companyName: string;
  address?: string | null;
  userName?: string | null;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
  mobileNo?: string | null;
  poNumber?: string | null;
  contractNo?: string | null;
  modelText: string;
  serialText: string;
  dateLabel: string;
  date?: string | null;
  time?: string | null;
  engineerName?: string | null;
  status?: string | null;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-black">{children}</div>;
}

function Cell({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={`px-3 py-1.5 text-[8pt] ${className}`}>
      <span className="font-bold">{label}: </span>
      <span>{value || ""}</span>
    </div>
  );
}

export function InstallationReport({
  title,
  companyName,
  address,
  userName,
  designation,
  department,
  email,
  mobileNo,
  poNumber,
  contractNo,
  modelText,
  serialText,
  dateLabel,
  date,
  time,
  engineerName,
  status,
}: InstallationReportProps) {
  return (
    <div className="mx-auto max-w-3xl border border-black text-black">
      <div className="border-b border-black px-3 py-3">
        <img src="/Cygnus Exp.png" className="h-8" />
      </div>

      <div className="border-b border-black bg-blue-200 px-3 py-1.5 text-center text-[13pt] font-bold">
        {title}
      </div>

      <Row>
        <Cell label="Customer Company Name" value={companyName} />
      </Row>
      <Row>
        <Cell label="Customer Address" value={address} />
      </Row>
      <Row>
        <div className="grid grid-cols-3">
          <Cell label="User Name" value={userName} className="border-r border-black" />
          <Cell label="Designation" value={designation} className="border-r border-black" />
          <Cell label="Department" value={department} />
        </div>
      </Row>
      <Row>
        <div className="grid grid-cols-2">
          <Cell label="E-mail Address" value={email} className="border-r border-black" />
          <Cell label="Mobile No" value={mobileNo} />
        </div>
      </Row>
      <Row>
        <Cell label="Purchase Order No" value={poNumber} />
      </Row>
      <Row>
        <Cell label="Contract No" value={contractNo} />
      </Row>

      <Row>
        <div className="px-3 py-1.5 text-[8pt]">
          <div className="font-bold">Model:</div>
          <div className="mt-1 min-h-20 whitespace-pre-line">{modelText}</div>
        </div>
      </Row>
      <Row>
        <div className="px-3 py-1.5 text-[8pt]">
          <div className="font-bold">Serial No/Service Tag:</div>
          <div className="mt-1 min-h-50 whitespace-pre-line">{serialText}</div>
        </div>
      </Row>

      <Row>
        <div className="grid grid-cols-2">
          <Cell label={dateLabel} value={date} className="border-r border-black" />
          <Cell label="Engineer Name" value={engineerName} />
        </div>
      </Row>
      <Row>
        <div className="grid grid-cols-2">
          <Cell label="Time" value={time} className="border-r border-black" />
          <Cell label="Status" value={status=="Closed"?"Completed":"Open"
          } />
        </div>
      </Row>

      <Row>
        <div className="px-3 py-1.5 text-[8pt]">
          <span className="font-bold underline">
            Acknowledgement by duly authorized representatives of both parties:
          </span>{" "}
          upon signing by Customer's duly authorized representative, Customer acknowledges Professional
          Services were delivered as detailed above.
        </div>
      </Row>
      <Row>
        <div className="px-3 py-1.5 text-[8pt]">
          <div className="font-bold underline">Customer Signature &amp; Remarks:</div>
          <div className="h-20" />
        </div>
      </Row>
      <div className="px-3 py-1.5 text-[8pt]">
        <div className="font-bold underline">Engineer Signature &amp; Remarks:</div>
        <div className="h-20" />
      </div>

      <div className="border-t border-black bg-slate-100 px-3 py-3 text-center text-[9pt]">
        <div className="font-bold">CYGNUS INFORMATION SOLUTIONS PVT. LTD.</div>
        <div>1005, Lodha Supremus, Saki Vihar Road, Andheri (E), Mumbai – 400072</div>
        <div>
          Website: <span className="underline">www.cygnussolutions.co.in</span>, Email:{" "}
          <span className="underline">techsupport@cygnussolutions.co.in</span>
        </div>
      </div>
    </div>
  );
}
