import React from "react";
import { splitAccent } from "../../utils/format";

/** Renders copy where *starred* words get the italic accent face. */
const Accent = ({ text }) => (
  <>
    {splitAccent(text).map((part, i) =>
      part.accent ? (
        <em key={i} className="accent-italic">
          {part.text}
        </em>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      )
    )}
  </>
);

export default Accent;
