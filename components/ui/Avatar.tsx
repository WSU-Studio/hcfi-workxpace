interface AvatarProps {
  children: React.ReactNode;
  className?: string;
}

const Avatar = ({ children, className = '' }: AvatarProps) => (
  <div className={`w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium ${className}`}>
    {children}
  </div>
);

export default Avatar;
