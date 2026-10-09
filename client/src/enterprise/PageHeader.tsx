import React from "react";
export default function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="es-page-header">
      <div>
        <span className="es-eyebrow">{eyebrow}</span>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{description}</p>
      </div>
      <div className="es-page-header-actions">{children}</div>
    </header>
  );
}
