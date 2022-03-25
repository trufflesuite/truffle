import {classNames} from 'src/functions';
import React, {FC, HTMLProps} from 'react';

export interface ModalContentProps {
  className?: string
}

const ModalContent: FC<ModalContentProps> = ({children, className = ''}) => {
  return <div className={classNames('', className)}>{children}</div>;
};

export interface ModalContentBorderedProps extends HTMLProps<HTMLDivElement> {
  className?: string
}

export const BorderedModalContent: FC<ModalContentBorderedProps> = ({children, className, ...rest}) => {
  return (
    <div {...rest} className={classNames(className, 'border border-grey rounded p-4')}>
      {children}
    </div>
  );
};

export default ModalContent;
