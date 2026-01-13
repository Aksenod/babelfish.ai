const DecorativeBlurs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-50/20 rounded-full blur-[100px] mix-blend-overlay"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-200/15 rounded-full blur-[120px] mix-blend-multiply"></div>
    </div>
  );
};

export default DecorativeBlurs;