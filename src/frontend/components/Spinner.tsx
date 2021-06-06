import React from 'react';
import './Spinner.scss';

export const Spinner: React.FC = () => {
    return (
        <>
            <div id="overlay">
                <div id="loader"></div>
            </div>
        </>
    );
};
