import {classNames} from 'src/functions';
import React, {FC, HTMLProps, useCallback} from 'react';

const COLOR: Record<string, string> = {
  default: 'text-primary hover:text-blue focus:text-blue',
  blue: 'text-blue opacity-80 hover:opacity-100 focus:opacity-100',
};

interface ExternalLinkProps extends Omit<HTMLProps<HTMLAnchorElement>, 'as' | 'ref' | 'onClick'> {
  href: string
  startIcon?: JSX.Element
  endIcon?: JSX.Element
}

const ExternalLink: FC<ExternalLinkProps> = ({
                                               target = '_blank',
                                               href,
                                               children,
                                               rel = 'noopener noreferrer',
                                               className = '',
                                               color = 'default',
                                               startIcon = undefined,
                                               endIcon = undefined,
                                               ...rest
                                             }) => {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // don't prevent default, don't redirect if it's a new tab
      if (target === '_blank' || event.ctrlKey || event.metaKey) {
      } else {
        event.preventDefault();
      }
    },
    [target]
  );

  return (
    <a
      target={target}
      rel={rel}
      href={href}
      onClick={handleClick}
      className={classNames(
        'text-baseline whitespace-nowrap',
        COLOR[color],
        (startIcon || endIcon) && 'space-x-2 flex items-center justify-center',
        className
      )}
      {...rest}
    >
      {startIcon && startIcon}
      {children}
      {endIcon && endIcon}
    </a>
  );
};

export default ExternalLink;
