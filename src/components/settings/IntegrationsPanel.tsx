"use client";

export function IntegrationsPanel() {
  const integrations = [
    {
      name: "Google Calendar",
      desc: "Delegate action units as calendar events",
      icon: "cal",
      status: "coming-soon",
    },
    {
      name: "Todoist",
      desc: "Send action units to your task list",
      icon: "todo",
      status: "coming-soon",
    },
    {
      name: "Slack",
      desc: "Share contexts and assemblies to channels",
      icon: "slack",
      status: "coming-soon",
    },
    {
      name: "Notion",
      desc: "Export assemblies to Notion pages",
      icon: "notion",
      status: "coming-soon",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Integrations
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Connect Flowmind with your existing tools.
        </p>
      </div>
      <div className="space-y-3">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-secondary text-sm font-medium text-text-secondary">
                {integration.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-text-primary">
                  {integration.name}
                </p>
                <p className="text-sm text-text-secondary">
                  {integration.desc}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-bg-secondary px-3 py-1 text-xs text-text-tertiary">
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
