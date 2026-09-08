export const DashboardCard = ({title, children,}: {
    title: string,
    children: React.ReactNode;
}) => (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
    </div>
);