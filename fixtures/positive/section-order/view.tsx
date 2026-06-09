interface ViewProps {
  readonly label: string;
}

const DEFAULT_PROPS: ViewProps = {
  label: "Ready",
};

export const View = (props: ViewProps = DEFAULT_PROPS) => <div>{props.label}</div>;
