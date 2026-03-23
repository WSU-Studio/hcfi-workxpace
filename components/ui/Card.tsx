interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps) => (
  <div
    className={`bg-white p-4 rounded-lg border border-gray-200 transition-all duration-300 hover:border-blue-500 hover:shadow-md ${className}`}
  >
    {children}
  </div>
);

export default Card;
